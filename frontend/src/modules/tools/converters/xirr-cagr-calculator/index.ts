import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const xirrCagrCalculatorTool: ToolRegistryEntry = {
  slug: "xirr-cagr-calculator",
  name: "XIRR & CAGR Calculator",
  module: "converters",
  description: "Compute XIRR for SIPs and irregular cash flows (Excel-compatible) or CAGR between two values, with total invested, gain, absolute return and doubling time.",
  aliases: ["xirr calculator","sip return calculator","cagr calculator","mutual fund xirr","annualized return"],
  icon: "TrendingUp",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["xirr calculator","sip return calculator","cagr calculator","mutual fund xirr","annualized return"] },
};
