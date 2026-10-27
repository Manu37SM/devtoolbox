import type { TransformResult } from "@/lib/tool-transform";
import type { EmiLoanCalculatorOptions } from "./schema";

export function emi(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / months;
  const f = (1 + r) ** months;
  return (principal * r * f) / (f - 1);
}

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function calcEmi(_input: string, o: EmiLoanCalculatorOptions): TransformResult {
  if (!(o.principal > 0)) return { output: "", error: { message: "Loan amount must be greater than zero." } };
  const months = Math.round(o.tenureUnit === "years" ? o.tenure * 12 : o.tenure);
  if (!(months >= 1) || months > 600) return { output: "", error: { message: "Tenure must be between 1 and 600 months." } };
  if (o.rate < 0 || o.rate > 100) return { output: "", error: { message: "Interest rate must be between 0 and 100%." } };

  const pay = emi(o.principal, o.rate, months);
  const total = pay * months;
  const rows = [
    `Monthly EMI       ${money(pay)}`,
    `Total interest    ${money(total - o.principal)}`,
    `Total payment     ${money(total)}`,
    `Interest share    ${(((total - o.principal) / total) * 100).toFixed(1)}% of total`,
  ];
  if (o.schedule) {
    const r = o.rate / 12 / 100;
    let bal = o.principal;
    rows.push("", "Month   Interest     Principal    Balance");
    for (let m = 1; m <= months; m++) {
      const interest = bal * r;
      const princ = m === months ? bal : pay - interest;
      bal = Math.max(0, bal - princ);
      rows.push(`${String(m).padStart(5)}  ${money(interest).padStart(10)}  ${money(princ).padStart(11)}  ${money(bal).padStart(12)}`);
    }
  }
  rows.push("", "Reducing-balance method, monthly compounding. Banks may differ by rounding, processing fees and day-count rules — treat this as an estimate.");
  return { output: rows.join("\n"), error: null };
}
