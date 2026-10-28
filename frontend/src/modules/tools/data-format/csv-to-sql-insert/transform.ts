import type { TransformResult } from "@/lib/tool-transform";
import type { CsvToSqlInsertOptions } from "./schema";

export function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false, quoted = false;
  const endField = () => { row.push(cur); cur = ""; quoted = false; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && cur === "") { q = true; quoted = true; }
    else if (c === delim) endField();
    else if (c === "\n" || (c === "\r" && text[i + 1] === "\n")) { if (c === "\r") i++; endField(); rows.push(row); row = []; }
    else cur += c;
  }
  if (q) throw new Error("Unterminated quoted field");
  if (cur !== "" || row.length || quoted) { endField(); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] ?? "").trim() !== "");
}

const quoteId = (id: string, d: CsvToSqlInsertOptions["dialect"]) => {
  const clean = id.trim().replace(/[^\w$ ]/g, "_");
  if (d === "mysql") return `\`${clean}\``;
  if (d === "sqlserver") return `[${clean}]`;
  if (d === "oracle") return `"${clean.toUpperCase()}"`;
  return `"${clean}"`;
};

const NUM = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

function literal(v: string, o: CsvToSqlInsertOptions): string {
  if (o.emptyAsNull && v.trim() === "") return "NULL";
  if (o.inferTypes) {
    if (NUM.test(v.trim()) && !/^-?0\d/.test(v.trim())) return v.trim();
    if (/^null$/i.test(v.trim())) return "NULL";
    if (/^(true|false)$/i.test(v.trim()) && (o.dialect === "postgres" || o.dialect === "mysql" || o.dialect === "sqlite")) return v.trim().toUpperCase();
  }
  const esc = v.replace(/'/g, "''");
  const s = o.dialect === "mysql" ? esc.replace(/\\/g, "\\\\") : esc;
  return `${o.dialect === "sqlserver" && /[^\x20-\x7e]/.test(v) ? "N" : ""}'${s}'`;
}

/** Input: CSV with a header row. An optional first line `table: schema.name` sets the table name. */
export function csvToInsert(input: string, o: CsvToSqlInsertOptions): TransformResult {
  let text = input;
  let table = "my_table";
  const tm = /^\s*table\s*:\s*([\w.]+)\s*\r?\n/i.exec(text);
  if (tm) { table = tm[1]!; text = text.slice(tm[0].length); }
  if (!text.trim()) return { output: "", error: null };
  let rows: string[][];
  try { rows = parseCsv(text, o.delimiter === "tab" ? "\t" : o.delimiter); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  if (rows.length < 2) return { output: "", error: { message: "Need a header row and at least one data row" } };
  const header = rows[0]!;
  if (header.some((h) => !h.trim())) return { output: "", error: { message: "Header contains an empty column name", line: 1 } };
  const dup = header.find((h, i) => header.findIndex((x) => x.trim().toLowerCase() === h.trim().toLowerCase()) !== i);
  if (dup) return { output: "", error: { message: `Duplicate column name "${dup}"`, line: 1 } };
  for (const [i, r] of rows.slice(1).entries()) if (r.length !== header.length) return { output: "", error: { message: `Row has ${r.length} fields but the header has ${header.length}`, line: i + 2 } };
  const tbl = table.split(".").map((p) => quoteId(p, o.dialect)).join(".");
  const cols = header.map((h) => quoteId(h, o.dialect)).join(", ");
  const tuples = rows.slice(1).map((r) => "(" + r.map((v) => literal(v, o)).join(", ") + ")");
  const out: string[] = [];
  if (o.dialect === "oracle") {
    for (const t of tuples) out.push(`INSERT INTO ${tbl} (${cols}) VALUES ${t};`);
  } else if (o.dialect === "sqlserver") {
    for (let i = 0; i < tuples.length; i += Math.min(o.batchSize, 1000)) out.push(`INSERT INTO ${tbl} (${cols}) VALUES\n  ${tuples.slice(i, i + Math.min(o.batchSize, 1000)).join(",\n  ")};`);
  } else {
    for (let i = 0; i < tuples.length; i += o.batchSize) out.push(`INSERT INTO ${tbl} (${cols}) VALUES\n  ${tuples.slice(i, i + o.batchSize).join(",\n  ")};`);
  }
  return { output: out.join(o.dialect === "oracle" ? "\n" : "\n\n") + "\n", error: null };
}
