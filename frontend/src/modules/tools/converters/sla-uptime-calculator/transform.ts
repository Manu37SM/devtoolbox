import type { TransformResult } from "@/lib/tool-transform";
import type { SlaUptimeCalculatorOptions } from "./schema";

const DAY = 86400;
export const periods = (month: SlaUptimeCalculatorOptions["month"]): [string, number][] => [
  ["day", DAY], ["week", 7 * DAY], ["month", (month === "30" ? 30 : 365.25 / 12) * DAY], ["quarter", (month === "30" ? 90 : 365.25 / 4) * DAY], ["year", 365.25 * DAY],
];

export function formatDuration(sec: number): string {
  if (sec < 1) return `${+(sec * 1000).toFixed(1)}ms`;
  const parts: string[] = [];
  let s = sec;
  for (const [unit, size] of [["d", DAY], ["h", 3600], ["m", 60]] as const) { const n = Math.floor(s / size + 1e-9); if (n) { parts.push(`${n}${unit}`); s -= n * size; } }
  const rounded = Math.round(s * 10) / 10;
  if (rounded >= 0.05 || !parts.length) parts.push(`${+rounded.toFixed(1)}s`);
  return parts.join(" ");
}

/** "43m 50s per month", "8.76h/year", "5 min per day" -> seconds and period seconds. */
export function parseDowntime(s: string, month: SlaUptimeCalculatorOptions["month"]): { seconds: number; period: number; periodName: string } | null {
  const m = /^(.*?)\s*(?:per|\/|a|each)\s*(day|week|month|quarter|year)$/i.exec(s.trim());
  if (!m) return null;
  let total = 0, matched = false;
  for (const t of m[1]!.matchAll(/(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?)\b/gi)) {
    matched = true;
    const n = Number(t[1]);
    const u = t[2]!.toLowerCase();
    total += u.startsWith("ms") || u.startsWith("milli") ? n / 1000 : u.startsWith("s") ? n : u.startsWith("m") ? n * 60 : u.startsWith("h") ? n * 3600 : n * DAY;
  }
  if (!matched) return null;
  const name = m[2]!.toLowerCase();
  return { seconds: total, period: periods(month).find(([p]) => p === name)![1], periodName: name };
}

export function parsePercent(s: string): number | null {
  const m = /^(\d{1,3}(?:\.\d+)?)\s*%?$/.exec(s.trim());
  if (!m) return null;
  const v = Number(m[1]);
  return v > 0 && v <= 100 ? v / 100 : null;
}

const pct = (a: number) => `${+(a * 100).toPrecision(10)}%`;
const nines = (a: number) => (a >= 1 ? "100%" : `${(-Math.log10(1 - a)).toFixed(2)} nines`);

export function runSlaUptimeCalculator(input: string, options: SlaUptimeCalculatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim()).filter(Boolean);
  if (!lines.length) return { output: "", error: null };
  const ps = periods(options.month);
  const values: { label: string; a: number }[] = [];
  const out: string[] = [];
  for (const line of lines) {
    const p = parsePercent(line);
    if (p !== null) { values.push({ label: line.replace(/%?$/, "%"), a: p }); continue; }
    const d = parseDowntime(line, options.month);
    if (d) {
      const a = 1 - d.seconds / d.period;
      if (a < 0) return { output: "", error: { message: `"${line}" is more downtime than the ${d.periodName} has.` } };
      values.push({ label: `${line} -> ${pct(a)}`, a });
      continue;
    }
    return { output: "", error: { message: `"${line}" is neither a percentage (99.95) nor a downtime like "43m per month".` } };
  }
  const table = (rows: { label: string; a: number }[]) => {
    const head = ["Availability", ...ps.map(([n]) => `per ${n}`)];
    const body = rows.map((r) => [r.label, ...ps.map(([, sec]) => formatDuration((1 - r.a) * sec))]);
    const w = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i]!.length)));
    return [head, ...body].map((r) => r.map((c, i) => c.padEnd(w[i]!)).join("  ").trimEnd()).join("\n");
  };
  if (options.mode === "table") out.push(table(values));
  else {
    const combined = options.mode === "series" ? values.reduce((p, v) => p * v.a, 1) : 1 - values.reduce((p, v) => p * (1 - v.a), 1);
    out.push(`${options.mode === "series" ? "In series (all must be up)" : "In parallel (any one up is enough)"}: ${values.map((v) => pct(v.a)).join(options.mode === "series" ? " x " : " || ")} = ${pct(combined)} (${nines(combined)})`, "", table([{ label: pct(combined), a: combined }]));
    if (options.mode === "parallel") out.push("", "Parallel math assumes independent failures and instant failover; shared dependencies (DNS, region, deploys) make real availability lower.");
    if (options.mode === "series") out.push("", "Each dependency in the request path multiplies in: your SLA cannot exceed the product of your dependencies' SLAs.");
  }
  out.push("", `Month = ${options.month === "30" ? "30 days" : "365.25/12 days (30.44)"}; year = 365.25 days.`);
  return { output: out.join("\n"), error: null };
}
