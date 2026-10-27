import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const percentageCalculatorTool: ToolRegistryEntry = {
  slug: "percentage-calculator",
  name: "Percentage Calculator",
  module: "converters",
  description: "Answer percentage questions in plain phrases: X% of Y, X is what % of Y, percent change, increase/decrease by, discounts.",
  aliases: ["percent calculator","percentage change","discount calculator","percent of"],
  icon: "Percent",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["percent calculator","percentage change","discount calculator","percent of"] },
};
