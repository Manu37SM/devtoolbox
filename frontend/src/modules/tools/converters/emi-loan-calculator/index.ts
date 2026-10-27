import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const emiLoanCalculatorTool: ToolRegistryEntry = {
  slug: "emi-loan-calculator",
  name: "EMI / Loan Calculator",
  module: "converters",
  description: "Monthly EMI, total interest and an optional month-by-month amortization schedule for a reducing-balance loan. An estimate — banks differ by fees and rounding.",
  aliases: ["emi calculator","home loan calculator","loan amortization","mortgage calculator"],
  icon: "Landmark",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["emi calculator","home loan calculator","loan amortization","mortgage calculator"] },
};
