import type { TransformResult } from "@/lib/tool-transform";
import type { SipCalculatorOptions } from "./schema";

export interface YearRow { year: number; invested: number; value: number }

/**
 * Month-by-month SIP model: the instalment is paid at the start of each month and the balance
 * then earns annualRate/12. The instalment steps up by `stepUpPct` at the start of every year.
 */
export function simulate(monthly: number, annualRatePct: number, years: number, stepUpPct: number, lump: number): { balance: number; invested: number; rows: YearRow[] } {
  const i = annualRatePct / 1200;
  let bal = lump, invested = lump;
  const rows: YearRow[] = [];
  for (let y = 0; y < years; y++) {
    const pay = monthly * (1 + stepUpPct / 100) ** y;
    for (let m = 0; m < 12; m++) { bal = (bal + pay) * (1 + i); invested += pay; }
    rows.push({ year: y + 1, invested, value: bal });
  }
  return { balance: bal, invested, rows };
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const money = (n: number) => inr.format(Math.round(n));

function fields(input: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const l of input.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0 && !l.trim().startsWith("#")) f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim().replace(/[,_%\s]/g, "");
  }
  return f;
}

export function runSip(input: string, o: SipCalculatorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const f = fields(input);
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const num = (k: string, def?: number): number | null => {
    if (f[k] === undefined || f[k] === "") return def ?? null;
    const n = Number(f[k]);
    return Number.isFinite(n) ? n : null;
  };
  const rate = num("rate"), years = num("years"), step = num("stepup", 0), lump = num("lump", 0), infl = num("inflation", 0);
  if (rate === null || rate < 0 || rate > 100) return fail("rate: annual return in percent (0 to 100) is required");
  if (years === null || !Number.isInteger(years) || years < 1 || years > 60) return fail("years: a whole number from 1 to 60 is required");
  if (step === null || step < 0 || step > 100) return fail("stepup must be 0 to 100 (percent per year)");
  if (lump === null || lump < 0) return fail("lump must be zero or more");
  if (infl === null || infl < 0 || infl > 50) return fail("inflation must be 0 to 50 (percent per year)");

  let monthly: number;
  if (o.mode === "required-sip") {
    const target = num("target");
    if (target === null || target <= 0) return fail("target: the corpus you want is required");
    const unit = simulate(1, rate, years, step, 0).balance; // the balance is linear in the instalment
    const fromLump = simulate(0, rate, years, 0, lump).balance;
    if (fromLump >= target) return { output: `Your lump sum alone grows to ${money(fromLump)}, which already meets the target.`, error: null };
    monthly = (target - fromLump) / unit;
  } else {
    const m = num("monthly");
    if (m === null || m < 0) return fail("monthly: the SIP amount is required");
    monthly = m;
  }

  const r = simulate(monthly, rate, years, step, 0);
  const l = lump > 0 ? simulate(0, rate, years, 0, lump) : { balance: 0, invested: 0, rows: [] as YearRow[] };
  const total = r.balance + l.balance, invested = r.invested + lump;
  const lines: string[] = [];
  if (o.mode === "required-sip") lines.push(`Required monthly SIP   ${money(monthly)}${step ? " (first year, stepping up " + step + "% a year)" : ""}`);
  lines.push(`Total invested        ${money(invested)}`, `Estimated returns     ${money(total - invested)}`, `Future value          ${money(total)}`);
  if (infl > 0) lines.push(`In today's money      ${money(total / (1 + infl / 100) ** years)} (at ${infl}% inflation)`);
  if (o.yearlyTable) {
    lines.push("", "Year  Invested        Value");
    r.rows.forEach((row, idx) => {
      const lumpRow = l.rows[idx];
      lines.push(`${String(row.year).padStart(4)}  ${money(row.invested + (lumpRow ? lump : 0)).padStart(12)}  ${money(row.value + (lumpRow?.value ?? 0)).padStart(12)}`);
    });
  }
  lines.push("", "Assumes a constant return, instalments at the start of each month and no tax or fund charges. Market returns are not guaranteed.");
  return { output: lines.join("\n"), error: null };
}
