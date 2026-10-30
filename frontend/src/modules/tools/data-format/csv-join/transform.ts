import type { TransformResult } from "@/lib/tool-transform";
import { detectDelimiter, formatCsv } from "@/lib/csv";
import { resolveColumns, toTable, type Row } from "@/lib/csv-table";
import type { CsvJoinOptions } from "./schema";

export interface JoinStats {
  left: number;
  right: number;
  matched: number;
  leftOnly: number;
  rightOnly: number;
  output: number;
}

export function joinCsv(left: string, right: string, options: Partial<CsvJoinOptions>): TransformResult {
  const o: CsvJoinOptions = {
    delimiter: options.delimiter ?? "auto",
    hasHeader: options.hasHeader ?? true,
    leftKey: options.leftKey ?? "",
    rightKey: options.rightKey ?? "",
    joinType: options.joinType ?? "left",
    ignoreCase: options.ignoreCase ?? false,
    trimKeys: options.trimKeys ?? true,
    suffix: options.suffix ?? "_right",
    dropRightKeys: options.dropRightKeys ?? true,
    columns: options.columns ?? "",
    output: options.output ?? "csv",
  };
  if (!left.trim() && !right.trim()) return { output: "", error: null };
  const err = (message: string): TransformResult => ({ output: "", error: { message } });
  const delim = o.delimiter === "auto" ? detectDelimiter(left.trim() ? left : right) : o.delimiter;
  const a = toTable(left, delim, o.hasHeader);
  const b = toTable(right, delim, o.hasHeader);
  if (typeof a === "string") return err("The left CSV is empty.");
  if (typeof b === "string") return err("The right CSV is empty.");
  if (!o.leftKey.trim()) return err("Enter the key column(s) to join on.");
  const lk = resolveColumns(o.leftKey, a.columns);
  const rk = resolveColumns(o.rightKey.trim() ? o.rightKey : o.leftKey, b.columns);
  if (typeof lk === "string") return err(`Left file: ${lk}`);
  if (typeof rk === "string") return err(`Right file: ${rk}`);
  if (lk.length !== rk.length) return err(`The keys must have the same number of columns (${lk.length} on the left, ${rk.length} on the right).`);

  const norm = (v: string) => {
    let s = o.trimKeys ? v.trim() : v;
    if (o.ignoreCase) s = s.toLowerCase();
    return s;
  };
  const keyOf = (row: Row, cols: string[]) => cols.map((c) => norm(row[c] ?? "")).join("\u0001");

  // Right-hand columns, renamed when they clash with the left.
  const rightCols = b.columns.filter((c) => !(o.dropRightKeys && rk.includes(c)));
  const taken = new Set(a.columns);
  const rename = new Map<string, string>();
  for (const c of rightCols) {
    let n = c;
    while (taken.has(n)) n += o.suffix || "_right";
    taken.add(n);
    rename.set(c, n);
  }
  const allColumns = [...a.columns, ...rightCols.map((c) => rename.get(c)!)];

  const index = new Map<string, number[]>();
  b.rows.forEach((r, i) => {
    const k = keyOf(r, rk);
    (index.get(k) ?? index.set(k, []).get(k)!).push(i);
  });
  const usedRight = new Set<number>();
  const rows: Row[] = [];
  const stats: JoinStats = { left: a.rows.length, right: b.rows.length, matched: 0, leftOnly: 0, rightOnly: 0, output: 0 };
  const merge = (l: Row | null, r: Row | null): Row => {
    const row: Row = {};
    for (const c of a.columns) row[c] = l?.[c] ?? "";
    if (!l && r) lk.forEach((c, i) => (row[c] = r[rk[i]!] ?? ""));
    for (const c of rightCols) row[rename.get(c)!] = r?.[c] ?? "";
    return row;
  };
  const wantLeft = o.joinType === "left" || o.joinType === "full" || o.joinType === "left-anti";
  const wantMatches = o.joinType !== "left-anti" && o.joinType !== "right-anti";
  for (const l of a.rows) {
    const hits = index.get(keyOf(l, lk)) ?? [];
    if (hits.length) {
      stats.matched += hits.length;
      hits.forEach((i) => usedRight.add(i));
      if (wantMatches) for (const i of hits) rows.push(merge(l, b.rows[i]!));
    } else {
      stats.leftOnly++;
      if (wantLeft) rows.push(merge(l, null));
    }
  }
  b.rows.forEach((r, i) => {
    if (usedRight.has(i)) return;
    stats.rightOnly++;
    if (o.joinType === "right" || o.joinType === "full" || o.joinType === "right-anti") rows.push(merge(null, r));
  });
  stats.output = rows.length;

  let cols = allColumns;
  if (o.columns.trim()) {
    const sel = resolveColumns(o.columns, allColumns);
    if (typeof sel === "string") return err(sel);
    cols = sel;
  }
  if (o.output === "stats") {
    return {
      output: [`Left rows: ${stats.left}`, `Right rows: ${stats.right}`, `Matched pairs: ${stats.matched}`, `Left rows without a match: ${stats.leftOnly}`, `Right rows without a match: ${stats.rightOnly}`, `Rows in result: ${stats.output}`].join("\n"),
      error: null,
    };
  }
  if (o.output === "json") return { output: JSON.stringify(rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))), null, 2), error: null };
  if (o.output === "markdown") {
    const esc = (v: string) => v.replace(/\|/g, "\\|").replace(/\n/g, " ");
    return { output: [`| ${cols.map(esc).join(" | ")} |`, `| ${cols.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${cols.map((c) => esc(r[c] ?? "")).join(" | ")} |`)].join("\n"), error: null };
  }
  return { output: formatCsv([cols, ...rows.map((r) => cols.map((c) => r[c] ?? ""))], delim), error: null };
}
