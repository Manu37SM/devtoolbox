import type { TransformResult } from "@/lib/tool-transform";
import type { XirrCagrCalculatorOptions } from "./schema";

export interface Flow { date: Date; amount: number }
const DAY = 86_400_000;

export function parseDate(s: string): Date | null {
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return utc(+m[1]!, +m[2]!, +m[3]!);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return utc(+m[3]!, +m[2]!, +m[1]!);
  return null;
}
function utc(y: number, mo: number, d: number): Date | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt : null;
}
const amount = (s: string) => { const t = s.replace(/[,_\s₹$€£]/g, ""); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };

/** Excel-compatible XIRR: actual/365 day count, Newton-Raphson with a bisection fallback. */
export function xirr(flows: Flow[]): number {
  const t0 = Math.min(...flows.map((f) => f.date.getTime()));
  const years = flows.map((f) => (f.date.getTime() - t0) / DAY / 365);
  const npv = (r: number) => flows.reduce((s, f, i) => s + f.amount / (1 + r) ** years[i]!, 0);
  const dnpv = (r: number) => flows.reduce((s, f, i) => s - (years[i]! * f.amount) / (1 + r) ** (years[i]! + 1), 0);
  let r = 0.1;
  for (let i = 0; i < 100; i++) {
    const v = npv(r), d = dnpv(r);
    if (!Number.isFinite(v) || !Number.isFinite(d) || d === 0) break;
    const next = r - v / d;
    if (next <= -1) break;
    if (Math.abs(next - r) < 1e-12) return next;
    r = next;
  }
  let lo = -0.999999, hi = 100;
  if (npv(lo) * npv(hi) > 0) throw new Error("No IRR found in the range -99.9% to 10000%: check the signs of the cash flows.");
  for (let i = 0; i < 300; i++) { const mid = (lo + hi) / 2; if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}

const pct = (r: number) => `${(r * 100).toFixed(2)}%`;
const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export function runXirrCagrCalculator(input: string, options: XirrCagrCalculatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim()).filter(Boolean);
  if (!lines.length) return { output: "", error: null };
  if (options.mode === "cagr") {
    const f = new Map<string, string>();
    for (const l of lines) { const m = /^([\w-]+)\s*:\s*(.+)$/.exec(l); if (m) f.set(m[1]!.toLowerCase(), m[2]!.trim()); }
    const start = amount(f.get("start") ?? ""), end = amount(f.get("end") ?? "");
    if (start === null || end === null) return { output: "", error: { message: 'Use "start: 100000", "end: 200000" and "years: 5" (or "from: 2020-01-01" and "to: 2025-01-01").' } };
    if (start <= 0 || end < 0) return { output: "", error: { message: "start must be positive and end cannot be negative." } };
    let years = amount(f.get("years") ?? "");
    if (years === null) {
      const a = parseDate(f.get("from") ?? ""), b = parseDate(f.get("to") ?? "");
      if (!a || !b) return { output: "", error: { message: 'Add "years: 5" or both "from:" and "to:" dates (YYYY-MM-DD).' } };
      years = (b.getTime() - a.getTime()) / DAY / 365.25;
    }
    if (years <= 0) return { output: "", error: { message: "The period must be longer than zero." } };
    const cagr = (end / start) ** (1 / years) - 1;
    return { output: [`CAGR: ${pct(cagr)} per year`, `Absolute return: ${pct(end / start - 1)} over ${+years.toFixed(2)} years`, `Gain: ${money(end - start)}`, `Doubling time at this rate: ${cagr > 0 ? `${(Math.log(2) / Math.log(1 + cagr)).toFixed(1)} years` : "n/a"}`].join("\n"), error: null };
  }
  const flows: Flow[] = [];
  for (const l of lines) {
    const parts = l.split(/[\s,;\t]+/).filter(Boolean);
    const d = parts[0] ? parseDate(parts[0]) : null;
    const a = parts.length > 1 ? amount(parts.slice(1).join("")) : null;
    if (!d || a === null) return { output: "", error: { message: `"${l}" should be "<date> <amount>", e.g. "2024-01-05 -5000". Investments are negative, withdrawals and the current value positive.` } };
    flows.push({ date: d, amount: a });
  }
  if (!flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return { output: "", error: { message: "XIRR needs at least one negative (investment) and one positive (redemption or current value) cash flow." } };
  let r: number;
  try { r = xirr(flows); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const invested = -flows.filter((f) => f.amount < 0).reduce((s, f) => s + f.amount, 0);
  const returned = flows.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0);
  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const days = (sorted[sorted.length - 1]!.date.getTime() - sorted[0]!.date.getTime()) / DAY;
  return {
    output: [
      `XIRR: ${pct(r)} per year`,
      `Invested: ${money(invested)}   Received/value: ${money(returned)}   Net: ${money(returned - invested)}`,
      `Absolute return: ${pct(returned / invested - 1)} over ${Math.round(days)} days (${flows.length} cash flows)`,
      "",
      "Day count actual/365 from the first cash flow, as Excel's XIRR. Returns under a year are annualised, which can exaggerate short-term results.",
    ].join("\n"),
    error: null,
  };
}
