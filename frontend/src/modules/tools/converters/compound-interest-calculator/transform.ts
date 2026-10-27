import type { TransformResult } from "@/lib/tool-transform";
import type { CompoundInterestCalculatorOptions } from "./schema";

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function futureValue(principal: number, ratePct: number, years: number, compoundsPerYear: number, monthlyContribution: number): { value: number; invested: number } {
  const monthlyRate = (1 + ratePct / 100 / compoundsPerYear) ** (compoundsPerYear / 12) - 1;
  const months = Math.round(years * 12);
  let bal = principal;
  for (let m = 0; m < months; m++) bal = bal * (1 + monthlyRate) + monthlyContribution;
  return { value: bal, invested: principal + monthlyContribution * months };
}

export function calcCompound(_input: string, o: CompoundInterestCalculatorOptions): TransformResult {
  if (o.principal < 0 || o.monthly < 0) return { output: "", error: { message: "Amounts can't be negative." } };
  if (o.principal === 0 && o.monthly === 0) return { output: "", error: { message: "Enter a starting amount or a monthly contribution." } };
  if (!(o.years > 0) || o.years > 100) return { output: "", error: { message: "Years must be between 0 and 100." } };
  if (o.rate < 0 || o.rate > 100) return { output: "", error: { message: "Rate must be between 0 and 100%." } };
  const n = Number(o.compounding);
  const { value, invested } = futureValue(o.principal, o.rate, o.years, n, o.monthly);
  const rows = [
    `Final value     ${money(value)}`,
    `Total invested  ${money(invested)}`,
    `Gain            ${money(value - invested)}  (${invested > 0 ? (((value - invested) / invested) * 100).toFixed(1) : "0"}% on invested)`,
    `Effective annual yield  ${(((1 + o.rate / 100 / n) ** n - 1) * 100).toFixed(4)}%`,
  ];
  if (o.yearly) {
    rows.push("", "Year   Balance");
    for (let y = 1; y <= Math.min(Math.ceil(o.years), 50); y++) rows.push(`${String(y).padStart(4)}   ${money(futureValue(o.principal, o.rate, Math.min(y, o.years), n, o.monthly).value)}`);
  }
  rows.push("", "Monthly contributions are assumed at the end of each month. Returns are illustrative, not a forecast or advice; taxes and fees are ignored.");
  return { output: rows.join("\n"), error: null };
}
