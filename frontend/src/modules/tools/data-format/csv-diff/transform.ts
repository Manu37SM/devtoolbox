import type { TransformResult } from "@/lib/tool-transform";
import { detectDelimiter, formatCsv } from "@/lib/csv";
import { resolveColumns, toTable, type Row } from "@/lib/csv-table";
import type { CsvDiffOptions } from "./schema";

interface Change {
  key: string;
  column: string;
  before: string;
  after: string;
}
export interface CsvDiffResult {
  columnsAdded: string[];
  columnsRemoved: string[];
  added: { key: string; row: Row }[];
  removed: { key: string; row: Row }[];
  changed: { key: string; before: Row; after: Row; changes: Change[] }[];
  unchanged: { key: string; row: Row }[];
}

export function diffCsvData(before: string, after: string, o: CsvDiffOptions): { result: CsvDiffResult; columns: string[] } | { error: string } {
  const delim = o.delimiter === "auto" ? detectDelimiter(before.trim() ? before : after) : o.delimiter;
  const a = toTable(before, delim, o.hasHeader);
  const b = toTable(after, delim, o.hasHeader);
  if (typeof a === "string") return { error: "The Before CSV is empty." };
  if (typeof b === "string") return { error: "The After CSV is empty." };
  const columns = [...a.columns, ...b.columns.filter((c) => !a.columns.includes(c))];
  const ignored = resolveColumns(o.ignoreColumns, columns);
  if (typeof ignored === "string") return { error: ignored };
  const keys = resolveColumns(o.keyColumns, columns);
  if (typeof keys === "string") return { error: keys };
  const compared = columns.filter((c) => !ignored.includes(c) && !keys.includes(c));

  const norm = (v: string) => {
    let s = o.trimWhitespace ? v.trim() : v;
    if (o.ignoreCase) s = s.toLowerCase();
    return s;
  };
  const same = (x: string, y: string) => {
    if (norm(x) === norm(y)) return true;
    if (o.numericTolerance > 0) {
      const nx = Number(x.trim());
      const ny = Number(y.trim());
      if (x.trim() !== "" && y.trim() !== "" && Number.isFinite(nx) && Number.isFinite(ny)) return Math.abs(nx - ny) <= o.numericTolerance;
    }
    return false;
  };

  const rowId = (row: Row) => (keys.length ? keys : columns.filter((c) => !ignored.includes(c))).map((c) => norm(row[c] ?? "")).join("\u0001");
  const label = (row: Row) => (keys.length ? keys.map((k) => `${k}=${row[k] ?? ""}`).join(", ") : "");
  const index = (rows: Row[]) => {
    const seen = new Map<string, number>();
    const m = new Map<string, Row>();
    for (const r of rows) {
      const id = rowId(r);
      const n = (seen.get(id) ?? 0) + 1;
      seen.set(id, n);
      m.set(`${id}\u0002${n}`, r);
    }
    return m;
  };
  const ia = index(a.rows);
  const ib = index(b.rows);
  const result: CsvDiffResult = {
    columnsAdded: b.columns.filter((c) => !a.columns.includes(c)),
    columnsRemoved: a.columns.filter((c) => !b.columns.includes(c)),
    added: [],
    removed: [],
    changed: [],
    unchanged: [],
  };
  for (const [id, row] of ia) {
    const other = ib.get(id);
    if (!other) {
      result.removed.push({ key: label(row), row });
      continue;
    }
    const changes: Change[] = [];
    for (const c of compared) if (!same(row[c] ?? "", other[c] ?? "")) changes.push({ key: label(row), column: c, before: row[c] ?? "", after: other[c] ?? "" });
    if (changes.length) result.changed.push({ key: label(row), before: row, after: other, changes });
    else result.unchanged.push({ key: label(row), row: other });
  }
  for (const [id, row] of ib) if (!ia.has(id)) result.added.push({ key: label(row), row });
  return { result, columns };
}

const show = (row: Row) =>
  Object.entries(row)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");

export function compareCsv(before: string, after: string, options: Partial<CsvDiffOptions>): TransformResult {
  const o: CsvDiffOptions = {
    delimiter: options.delimiter ?? "auto",
    hasHeader: options.hasHeader ?? true,
    keyColumns: options.keyColumns ?? "",
    ignoreColumns: options.ignoreColumns ?? "",
    ignoreCase: options.ignoreCase ?? false,
    trimWhitespace: options.trimWhitespace ?? true,
    numericTolerance: options.numericTolerance ?? 0,
    output: options.output ?? "summary",
    includeUnchanged: options.includeUnchanged ?? false,
  };
  if (!before.trim() && !after.trim()) return { output: "", error: null };
  const d = diffCsvData(before, after, o);
  if ("error" in d) return { output: "", error: { message: d.error } };
  const { result: r, columns } = d;

  if (o.output === "json") return { output: JSON.stringify({ columnsAdded: r.columnsAdded, columnsRemoved: r.columnsRemoved, added: r.added.map((x) => x.row), removed: r.removed.map((x) => x.row), changed: r.changed.map((c) => ({ key: c.key, changes: c.changes.map(({ column, before: b, after: a }) => ({ column, before: b, after: a })) })), unchanged: r.unchanged.length }, null, 2), error: null };

  if (o.output === "csv") {
    const delim = o.delimiter === "auto" ? detectDelimiter(before.trim() ? before : after) : o.delimiter;
    const rows: string[][] = [["_diff", "_changed", ...columns]];
    const line = (tag: string, row: Row, changed = "") => rows.push([tag, changed, ...columns.map((c) => row[c] ?? "")]);
    r.removed.forEach((x) => line("removed", x.row));
    r.added.forEach((x) => line("added", x.row));
    r.changed.forEach((x) => line("changed", x.after, x.changes.map((c) => c.column).join(" ")));
    if (o.includeUnchanged) r.unchanged.forEach((x) => line("same", x.row));
    return { output: formatCsv(rows, delim), error: null };
  }

  const out: string[] = [];
  if (r.columnsAdded.length) out.push(`Columns added: ${r.columnsAdded.join(", ")}`);
  if (r.columnsRemoved.length) out.push(`Columns removed: ${r.columnsRemoved.join(", ")}`);
  const keyed = o.keyColumns.trim() !== "";
  for (const x of r.removed) out.push(`- ${keyed ? x.key : show(x.row)}`);
  for (const x of r.added) out.push(`+ ${keyed ? x.key : show(x.row)}`);
  for (const x of r.changed) out.push(`~ ${x.key}: ${x.changes.map((c) => `${c.column}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`).join("; ")}`);
  if (out.length) out.push("");
  out.push(`${r.added.length} added, ${r.removed.length} removed, ${r.changed.length} changed, ${r.unchanged.length} unchanged`);
  return { output: out.join("\n"), error: null };
}
