import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const compoundInterestCalculatorTool: ToolRegistryEntry = {
  slug: "compound-interest-calculator",
  name: "Compound Interest / SIP Calculator",
  module: "converters",
  description: "Future value of a lump sum and/or monthly investments (SIP) with selectable compounding. Illustrative only — not advice.",
  aliases: ["sip calculator","fd calculator","compound interest","investment growth"],
  icon: "TrendingUp",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sip calculator","fd calculator","compound interest","investment growth"] },
};
