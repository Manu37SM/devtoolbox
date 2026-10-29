import type { TransformResult } from "@/lib/tool-transform";
import type { SqlInClauseBuilderOptions } from "./schema";

export function splitValues(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const byLine = trimmed.split(/\r?\n/);
  const parts = byLine.length > 1 ? byLine : trimmed.split(/[,;\t]/);
  return parts.map((p) => p.trim().replace(/^(['"`])(.*)\1$/, "$2")).filter((p) => p.length > 0);
}

const NUMERIC = /^-?\d+(\.\d+)?$/;
const quote = (v: string) => `'${v.replace(/'/g, "''")}'`;
const IDENT = /^[A-Za-z_][A-Za-z0-9_$#.]*$|^"[^"]+"$/;

export function runSqlInClauseBuilder(input: string, options: SqlInClauseBuilderOptions): TransformResult {
  let values = splitValues(input);
  if (values.length === 0) return { output: "", error: null };
  const col = options.column.trim() || "id";
  if (!IDENT.test(col)) return { output: "", error: { message: `"${col}" is not a plain column name. Use letters, digits and underscores, or a "quoted" identifier.` } };
  const before = values.length;
  if (options.dedupe) values = [...new Set(values)];
  const numeric = options.quoting === "number" || (options.quoting === "auto" && values.every((v) => NUMERIC.test(v)));
  if (options.quoting === "number") {
    const bad = values.find((v) => !NUMERIC.test(v));
    if (bad !== undefined) return { output: "", error: { message: `"${bad}" is not a number. Switch quoting to "String" or "Auto".` } };
  }
  const lit = values.map((v) => (numeric ? v : quote(v)));
  const chunks: string[][] = [];
  for (let i = 0; i < lit.length; i += options.chunkSize) chunks.push(lit.slice(i, i + options.chunkSize));
  const list = (c: string[]) => c.join(", ");
  let sql: string;
  switch (options.format) {
    case "in":
      sql = chunks.map((c) => `${col} IN (${list(c)})`).join("\n\n");
      break;
    case "or-chunks":
      sql = chunks.length === 1 ? `${col} IN (${list(chunks[0]!)})` : `(\n  ${chunks.map((c) => `${col} IN (${list(c)})`).join("\n  OR ")}\n)`;
      break;
    case "values":
      sql = `SELECT * FROM (VALUES\n  ${lit.map((v) => `(${v})`).join(",\n  ")}\n) AS t(${col})`;
      break;
    case "union-all":
      sql = lit.map((v, i) => `SELECT ${v}${i === 0 ? ` AS ${col}` : ""} FROM dual`).join("\nUNION ALL\n");
      break;
    case "insert":
      sql = chunks.map((c) => `INSERT INTO tmp_ids (${col}) VALUES\n  ${c.map((v) => `(${v})`).join(",\n  ")};`).join("\n\n");
      break;
  }
  const notes = [`-- ${values.length} value${values.length === 1 ? "" : "s"}${before !== values.length ? ` (${before - values.length} duplicate${before - values.length === 1 ? "" : "s"} removed)` : ""}, ${numeric ? "unquoted numbers" : "quoted strings"}`];
  if (options.format === "in" && chunks.length > 1) notes.push(`-- Split into ${chunks.length} IN lists of at most ${options.chunkSize}; Oracle allows 1000 expressions per list (ORA-01795).`);
  if (options.format === "union-all") notes.push("-- FROM dual is Oracle/MySQL syntax; drop it for PostgreSQL and SQL Server.");
  if (options.format === "values") notes.push("-- VALUES lists work in PostgreSQL, SQL Server and MySQL 8.0.19+ (as ROW(...)); use UNION ALL on Oracle before 23ai.");
  if (values.length > 5000) notes.push("-- For lists this long a temporary table or array bind (e.g. = ANY(?)) is faster and keeps the statement cacheable.");
  return { output: `${notes.join("\n")}\n${sql}`, error: null };
}
