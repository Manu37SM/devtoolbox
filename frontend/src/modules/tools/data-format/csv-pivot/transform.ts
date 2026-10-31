import type { TransformResult } from "@/lib/tool-transform";
import { detectDelimiter, formatCsv } from "@/lib/csv";
import { resolveColumns, toTable, type Row } from "@/lib/csv-table";
import type { CsvPivotOptions } from "./schema";

const FUNCS = ["count", "sum", "avg", "mean", "min", "max", "median", "distinct", "concat", "first", "last", "stdev", "mode", "nonempty"] as const;
type Func = (typeof FUNCS)[number];

interface Agg {
  fn: Func;
  col: string | null;
  label: string;
}

export function parseAggregates(spec: string, columns: string[]): Agg[] | string {
  const aggs: Agg[] = [];
  const re = /\s*([a-z]+)\(\s*([^)]*?)\s*\)(?:\s+as\s+([^\s,]+))?\s*(?:,|$)/gy;
  let m: RegExpExecArray | null;
  let last = 0;
  const text = spec.trim();
  if (!text) return "Enter at least one aggregate, for example count() or sum(amount).";
  while (last < text.length && (m = re.exec(text))) {
    last = re.lastIndex;
    const fn = m[1]!.toLowerCase() as Func;
    if (!FUNCS.includes(fn)) return `Unknown function "${m[1]}". Use: ${FUNCS.join(", ")}.`;
    let col: string | null = null;
    if (m[2]) {
      const r = resolveColumns(m[2], columns);
      if (typeof r === "string") return r;
      col = r[0]!;
    } else if (fn !== "count") return `${fn}() needs a column, for example ${fn}(amount).`;
    aggs.push({ fn, col, label: m[3] ?? (col ? `${fn}_${col}` : fn) });
  }
  if (last < text.length || !aggs.length) return `Could not read the aggregates "${text}". Write them like: count(), sum(amount), avg(price) as mean_price.`;
  return aggs;
}

const toNumber = (v: string, strip: boolean): number | null => {
  const s = (strip ? v.replace(/,/g, "") : v).trim();
  if (s === "" || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null;
  return Number(s);
};

function aggregate(a: Agg, rows: Row[], o: CsvPivotOptions): string {
  const raw = a.col ? rows.map((r) => r[a.col!] ?? "") : rows.map(() => "");
  const fmt = (n: number) => String(Number.parseFloat(n.toFixed(o.decimals)));
  if (a.fn === "count") return String(a.col ? raw.length : rows.length);
  if (a.fn === "nonempty") return String(raw.filter((v) => v.trim() !== "").length);
  if (a.fn === "distinct") return String(new Set(raw.map((v) => (o.caseInsensitive ? v.toLowerCase() : v))).size);
  if (a.fn === "first") return raw[0] ?? "";
  if (a.fn === "last") return raw[raw.length - 1] ?? "";
  if (a.fn === "concat") return [...new Set(raw)].join("; ");
  if (a.fn === "mode") {
    const c = new Map<string, number>();
    for (const v of raw) c.set(v, (c.get(v) ?? 0) + 1);
    return [...c.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "";
  }
  const nums: number[] = [];
  for (const v of raw) {
    const n = toNumber(v, o.stripThousands);
    if (n === null) {
      if (v.trim() === "" || o.skipNonNumeric) continue;
      throw new Error(`"${v}" in column "${a.col}" is not a number (needed for ${a.fn}). Enable "skip non-numeric" to ignore such cells.`);
    }
    nums.push(n);
  }
  if (!nums.length) return a.fn === "sum" ? "0" : "";
  const sum = nums.reduce((x, y) => x + y, 0);
  switch (a.fn) {
    case "sum": return fmt(sum);
    case "avg":
    case "mean": return fmt(sum / nums.length);
    case "min": return fmt(Math.min(...nums));
    case "max": return fmt(Math.max(...nums));
    case "median": {
      const s = [...nums].sort((x, y) => x - y);
      const mid = s.length >> 1;
      return fmt(s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2);
    }
    case "stdev": {
      if (nums.length < 2) return "";
      const mean = sum / nums.length;
      return fmt(Math.sqrt(nums.reduce((x, y) => x + (y - mean) ** 2, 0) / (nums.length - 1)));
    }
    default: return "";
  }
}

const cmp = (x: string, y: string) => {
  const a = Number(x), b = Number(y);
  return x !== "" && y !== "" && Number.isFinite(a) && Number.isFinite(b) ? a - b : x.localeCompare(y);
};

export function csvPivot(input: string, options: Partial<CsvPivotOptions>): TransformResult {
  const o: CsvPivotOptions = {
    delimiter: options.delimiter ?? "auto",
    hasHeader: options.hasHeader ?? true,
    groupBy: options.groupBy ?? "",
    aggregates: options.aggregates ?? "count()",
    pivotColumn: options.pivotColumn ?? "",
    fill: options.fill ?? "",
    sortBy: options.sortBy ?? "group",
    totals: options.totals ?? false,
    stripThousands: options.stripThousands ?? true,
    skipNonNumeric: options.skipNonNumeric ?? true,
    caseInsensitive: options.caseInsensitive ?? false,
    trim: options.trim ?? true,
    decimals: options.decimals ?? 4,
    output: options.output ?? "csv",
  };
  if (!input.trim()) return { output: "", error: null };
  const err = (message: string): TransformResult => ({ output: "", error: { message } });
  const delim = o.delimiter === "auto" ? detectDelimiter(input) : o.delimiter;
  const t = toTable(input, delim, o.hasHeader);
  if (typeof t === "string") return err("The CSV is empty.");
  const gb = o.groupBy.trim() ? resolveColumns(o.groupBy, t.columns) : [];
  if (typeof gb === "string") return err(gb);
  const aggs = parseAggregates(o.aggregates, t.columns);
  if (typeof aggs === "string") return err(aggs);
  let pivot: string | null = null;
  if (o.pivotColumn.trim()) {
    const p = resolveColumns(o.pivotColumn, t.columns);
    if (typeof p === "string") return err(p);
    pivot = p[0]!;
  }

  const norm = (v: string) => {
    const x = o.trim ? v.trim() : v;
    return o.caseInsensitive ? x.toLowerCase() : x;
  };
  const rows = t.rows.map((r) => (o.trim ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.trim()])) : r));
  const groups = new Map<string, { key: string[]; rows: Row[] }>();
  for (const r of rows) {
    const key = gb.map((c) => norm(r[c] ?? ""));
    const id = JSON.stringify(key);
    if (!groups.has(id)) groups.set(id, { key, rows: [] });
    groups.get(id)!.rows.push(r);
  }

  try {
    let head: string[];
    let body: string[][];
    let colTotals = false;
    if (pivot) {
      const first = aggs[0]!;
      const values = [...new Set(rows.map((r) => norm(r[pivot!] ?? "")))].sort(cmp);
      head = [...gb, ...values.map((v) => v || "(blank)")];
      body = [...groups.values()].map((g) => [
        ...g.key,
        ...values.map((v) => {
          const sub = g.rows.filter((r) => norm(r[pivot!] ?? "") === v);
          return sub.length ? aggregate(first, sub, o) : o.fill;
        }),
      ]);
      if (o.totals && ["count", "sum", "min", "max"].includes(first.fn)) {
        head.push("Total");
        body.forEach((r, i) => r.push(aggregate(first, [...groups.values()][i]!.rows, o)));
        colTotals = true;
      }
    } else {
      head = [...gb, ...aggs.map((a) => a.label)];
      body = [...groups.values()].map((g) => [...g.key, ...aggs.map((a) => aggregate(a, g.rows, o))]);
    }

    if (o.sortBy === "group") body.sort((a, b) => { for (let i = 0; i < gb.length; i++) { const c = cmp(a[i]!, b[i]!); if (c) return c; } return 0; });
    else if (o.sortBy === "group-desc") body.sort((a, b) => { for (let i = 0; i < gb.length; i++) { const c = cmp(b[i]!, a[i]!); if (c) return c; } return 0; });
    else if (o.sortBy !== "none") {
      const k = gb.length;
      const sign = o.sortBy === "first-aggregate-desc" ? -1 : 1;
      body.sort((a, b) => sign * cmp(a[k] ?? "", b[k] ?? ""));
    }

    const totalFns = ["count", "sum", "min", "max"];
    if (o.totals && !pivot && aggs.every((a) => totalFns.includes(a.fn))) {
      body.push([...gb.map((_c, i) => (i === 0 ? "Total" : "")), ...aggs.map((a) => aggregate(a, rows, o))]);
    } else if (o.totals && pivot && colTotals) {
      const first = aggs[0]!;
      const values = head.slice(gb.length, -1);
      body.push([
        ...gb.map((_c, i) => (i === 0 ? "Total" : "")),
        ...values.map((v) => aggregate(first, rows.filter((r) => (norm(r[pivot!] ?? "") || "(blank)") === v), o)),
        aggregate(first, rows, o),
      ]);
    }

    if (o.output === "json") return { output: JSON.stringify(body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""]))), null, 2), error: null };
    if (o.output === "markdown") {
      const esc = (v: string) => v.replace(/\|/g, "\\|");
      return { output: [`| ${head.map(esc).join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...body.map((r) => `| ${r.map(esc).join(" | ")} |`)].join("\n"), error: null };
    }
    return { output: formatCsv([head, ...body], o.output === "tsv" ? "\t" : delim === "\t" ? "," : delim), error: null };
  } catch (e) {
    return err((e as Error).message);
  }
}
