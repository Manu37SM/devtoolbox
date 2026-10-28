import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const numberFormatterTool: ToolRegistryEntry = {
  slug: "number-formatter",
  name: "Number Formatter (Locale)",
  module: "converters",
  description: "Format numbers for any locale: grouping and decimal separators, Indian lakh/crore style, currency, percent, compact (1.2M) and scientific notation, with a side-by-side locale comparison.",
  aliases: ["indian number format","locale number format","currency formatter","thousand separator","compact number notation"],
  icon: "Hash",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["indian number format","locale number format","currency formatter","thousand separator","compact number notation"] },
};
