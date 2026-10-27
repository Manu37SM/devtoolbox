import type { TransformResult } from "@/lib/tool-transform";
import type { JsonToSqlOptions } from "./schema";

type Kind = "null" | "int" | "long" | "double" | "boolean" | "string" | "json";
interface Column {
  source: string;
  name: string;
  kind: Kind;
  maxLen: number;
}

const RESERVED = new Set(
  "select from where table order group by user date level comment number size index key values insert update delete create drop alter column default primary references check unique join on as and or not null is in like between exists having union all distinct case when then else end limit offset grant row rows session start type timestamp".split(
    " ",
  ),
);

export function sanitizeIdentifier(raw: string): string {
  let id = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  if (id === "") id = "col";
  if (/^\d/.test(id)) id = `c_${id}`;
  if (RESERVED.has(id)) id += "_";
  return id.slice(0, 128);
}

function kindOf(v: unknown): Kind {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") {
    if (!Number.isInteger(v)) return "double";
    return Math.abs(v) <= 2_147_483_647 ? "int" : "long";
  }
  if (typeof v === "string") return "string";
  return "json";
}

function mergeKind(a: Kind, b: Kind): Kind {
  if (a === "null") return b;
  if (b === "null" || a === b) return a;
  const num = ["int", "long", "double"];
  if (num.includes(a) && num.includes(b)) return a === "double" || b === "double" ? "double" : "long";
  if (a === "json" || b === "json") return "json";
  return "string";
}

const stringify = (v: unknown): string => (typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v));

function roundUp(n: number): number {
  return [50, 100, 255, 500, 1000, 2000, 4000].find((s) => n <= s) ?? 4000;
}

function columnType(col: Column, d: JsonToSqlOptions["dialect"]): string {
  const long = col.maxLen > 4000;
  switch (d) {
    case "oracle":
      return { int: "NUMBER(10)", long: "NUMBER(19)", double: "NUMBER", boolean: "NUMBER(1)", null: "VARCHAR2(50)", json: "CLOB", string: long ? "CLOB" : `VARCHAR2(${roundUp(col.maxLen)})` }[col.kind];
    case "postgres":
      return { int: "INTEGER", long: "BIGINT", double: "DOUBLE PRECISION", boolean: "BOOLEAN", null: "TEXT", json: "JSONB", string: long ? "TEXT" : `VARCHAR(${roundUp(col.maxLen)})` }[col.kind];
    case "mysql":
      return { int: "INT", long: "BIGINT", double: "DOUBLE", boolean: "TINYINT(1)", null: "VARCHAR(50)", json: "JSON", string: long ? "TEXT" : `VARCHAR(${roundUp(col.maxLen)})` }[col.kind];
    case "sqlite":
      return { int: "INTEGER", long: "INTEGER", double: "REAL", boolean: "INTEGER", null: "TEXT", json: "TEXT", string: "TEXT" }[col.kind];
    case "sqlserver":
      return { int: "INT", long: "BIGINT", double: "FLOAT", boolean: "BIT", null: "NVARCHAR(50)", json: "NVARCHAR(MAX)", string: long ? "NVARCHAR(MAX)" : `NVARCHAR(${roundUp(col.maxLen)})` }[col.kind];
  }
}

function literal(value: unknown, col: Column, d: JsonToSqlOptions["dialect"]): string {
  if (value === null || value === undefined) return "NULL";
  if (col.kind === "boolean" && typeof value === "boolean") return d === "postgres" ? (value ? "TRUE" : "FALSE") : value ? "1" : "0";
  if ((col.kind === "int" || col.kind === "long" || col.kind === "double") && typeof value === "number") return String(value);
  let text = stringify(value).replace(/'/g, "''");
  if (d === "mysql") text = text.replace(/\\/g, "\\\\");
  return `${d === "sqlserver" ? "N" : ""}'${text}'`;
}

const ROWS_PER_STATEMENT = 500;

export function convertJsonToSql(input: string, options: JsonToSqlOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return { output: "", error: { message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}` } };
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  if (rows.length === 0 || rows.some((r) => typeof r !== "object" || r === null || Array.isArray(r))) {
    return { output: "", error: { message: "Expected a JSON object or a non-empty array of objects." } };
  }
  const records = rows as Record<string, unknown>[];

  const cols = new Map<string, Column>();
  const usedNames = new Set<string>();
  for (const rec of records) {
    for (const [key, value] of Object.entries(rec)) {
      let col = cols.get(key);
      if (!col) {
        let name = sanitizeIdentifier(key);
        for (let i = 2; usedNames.has(name); i++) name = `${sanitizeIdentifier(key)}_${i}`;
        usedNames.add(name);
        col = { source: key, name, kind: "null", maxLen: 0 };
        cols.set(key, col);
      }
      col.kind = mergeKind(col.kind, kindOf(value));
      if (value !== null && value !== undefined) col.maxLen = Math.max(col.maxLen, stringify(value).length);
    }
  }
  const columns = Array.from(cols.values());
  if (columns.length === 0) return { output: "", error: { message: "The objects have no properties to turn into columns." } };

  const table = sanitizeIdentifier(options.tableName || "my_table");
  const out: string[] = [];

  if (options.includeCreate) {
    const defs = columns.map((c) => `  ${c.name} ${columnType(c, options.dialect)}`);
    out.push(`CREATE TABLE ${table} (\n${defs.join(",\n")}\n);`, "");
  }

  const colList = columns.map((c) => c.name).join(", ");
  const tuple = (rec: Record<string, unknown>) => `(${columns.map((c) => literal(rec[c.source], c, options.dialect)).join(", ")})`;

  if (!options.multiRow) {
    for (const rec of records) out.push(`INSERT INTO ${table} (${colList}) VALUES ${tuple(rec)};`);
  } else if (options.dialect === "oracle") {
    for (let i = 0; i < records.length; i += ROWS_PER_STATEMENT) {
      const chunk = records.slice(i, i + ROWS_PER_STATEMENT);
      out.push("INSERT ALL", ...chunk.map((r) => `  INTO ${table} (${colList}) VALUES ${tuple(r)}`), "SELECT 1 FROM dual;");
    }
  } else {
    for (let i = 0; i < records.length; i += ROWS_PER_STATEMENT) {
      const chunk = records.slice(i, i + ROWS_PER_STATEMENT);
      out.push(`INSERT INTO ${table} (${colList}) VALUES\n${chunk.map((r) => "  " + tuple(r)).join(",\n")};`);
    }
  }
  return { output: out.join("\n"), error: null };
}
