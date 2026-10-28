import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const fractionDecimalConverterTool: ToolRegistryEntry = {
  slug: "fraction-decimal-converter",
  name: "Fraction ⇄ Decimal Converter",
  module: "converters",
  description: "Convert between fractions, mixed numbers, decimals and percentages with exact arithmetic: repeating decimals shown as 0.(3), best rational approximation for irrational-looking input.",
  aliases: ["decimal to fraction","fraction to decimal","repeating decimal","mixed number converter","percent to fraction"],
  icon: "Divide",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["decimal to fraction","fraction to decimal","repeating decimal","mixed number converter","percent to fraction"] },
};
