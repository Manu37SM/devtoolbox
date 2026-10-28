import type { TransformResult } from "@/lib/tool-transform";
import type { CsvProfilerOptions } from "./schema";

export function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const counts = [",", ";", "\t", "|"].map((d) => [d, first.split(d).length - 1] as const);
  return counts.sort((a, b) => b[1] - a[1])[0]![1] > 0 ? counts.sort((a, b) => b[1] - a[1])[0]![0] : ",";
}

/** RFC 4180 style parser: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string, delim: string): string[][] | { error: string; line: number } {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false, line = 1, quoteStart = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else { if (c === "\n") line++; field += c; }
    } else if (c === '"' && field === "") { inQ = true; quoteStart = line; }
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = ""; line++;
    } else field += c;
  }
  if (inQ) return { error: "Unterminated quoted field", line: quoteStart };
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function validCalendarDate(v: string): boolean {
  const [y, m, d] = v.slice(0, 10).split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && !Number.isNaN(Date.parse(v.replace(" ", "T")));
}

type Kind = "integer" | "decimal" | "boolean" | "date" | "text";
const NULLS = new Set(["", "null", "na", "n/a", "nan", "none", "nil", "-"]);

export function inferKind(v: string): Kind {
  if (/^[+-]?\d+$/.test(v)) return "integer";
  if (/^[+-]?(\d+\.\d*|\.\d+)(e[+-]?\d+)?$/i.test(v) || /^[+-]?\d+e[+-]?\d+$/i.test(v)) return "decimal";
  if (/^(true|false|yes|no)$/i.test(v)) return "boolean";
  if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(v) && validCalendarDate(v)) return "date";
  return "text";
}

const round = (n: number) => String(Number(n.toPrecision(6)));

export function profileCsv(input: string, o: CsvProfilerOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const delim = o.delimiter === "auto" ? detectDelimiter(input) : o.delimiter;
  const parsed = parseCsv(input.replace(/^\uFEFF/, ""), delim);
  if (!Array.isArray(parsed)) return { output: "", error: { message: parsed.error, line: parsed.line } };
  if (parsed.length < 1) return { output: "", error: { message: "No rows found" } };
  const header = parsed[0]!, rows = parsed.slice(1);
  const out: string[] = [`Rows: ${rows.length}   Columns: ${header.length}   Delimiter: ${delim === "\t" ? "tab" : JSON.stringify(delim)}`];
  const ragged = rows.map((r, i) => [i + 2, r.length] as const).filter(([, n]) => n !== header.length);
  if (ragged.length) out.push(`Warning: ${ragged.length} row(s) have a different number of fields (first: line ${ragged[0]![0]} has ${ragged[0]![1]}, expected ${header.length})`);
  const dupHeaders = header.filter((h, i) => header.indexOf(h) !== i);
  if (dupHeaders.length) out.push(`Warning: duplicate column names: ${[...new Set(dupHeaders)].join(", ")}`);
  header.forEach((name, c) => {
    const vals = rows.map((r) => (r[c] ?? "").trim());
    const present = vals.filter((v) => !NULLS.has(v.toLowerCase()));
    const kinds = new Map<Kind, number>();
    for (const v of present) { const k = inferKind(v); kinds.set(k, (kinds.get(k) ?? 0) + 1); }
    let type: string;
    if (!present.length) type = "empty";
    else if (kinds.size === 1) type = [...kinds.keys()][0]!;
    else if ([...kinds.keys()].every((k) => k === "integer" || k === "decimal")) type = "decimal";
    else type = `mixed (${[...kinds].map(([k, n]) => `${k} ${n}`).join(", ")})`;
    const counts = new Map<string, number>();
    for (const v of present) counts.set(v, (counts.get(v) ?? 0) + 1);
    const lines = [`${name || "(blank header)"}  [${type}]`, `  missing: ${vals.length - present.length}${vals.length ? ` (${round(((vals.length - present.length) / vals.length) * 100)}%)` : ""}   unique: ${counts.size}${counts.size === present.length && present.length > 1 ? "  (all distinct, candidate key)" : ""}`];
    if (type === "integer" || type === "decimal") {
      const nums = present.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
      if (nums.length) {
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const mid = nums.length % 2 ? nums[(nums.length - 1) / 2]! : (nums[nums.length / 2 - 1]! + nums[nums.length / 2]!) / 2;
        const sd = nums.length > 1 ? Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1)) : 0;
        lines.push(`  min: ${round(nums[0]!)}   max: ${round(nums[nums.length - 1]!)}   mean: ${round(mean)}   median: ${round(mid)}   stddev: ${round(sd)}`);
      }
    } else if (type === "date") {
      const sorted = [...present].sort();
      lines.push(`  earliest: ${sorted[0]}   latest: ${sorted[sorted.length - 1]}`);
    } else if (present.length) {
      const lens = present.map((v) => v.length);
      lines.push(`  length: ${Math.min(...lens)} to ${Math.max(...lens)}`);
    }
    if (o.topValues > 0 && counts.size > 0 && counts.size < present.length) {
      const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, o.topValues);
      lines.push(`  top: ${top.map(([v, n]) => `${v.length > 30 ? v.slice(0, 27) + "..." : v} (${n})`).join(", ")}`);
    }
    out.push("", ...lines);
  });
  return { output: out.join("\n"), error: null };
}
