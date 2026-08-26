import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const romanNumeralConverterTool: ToolRegistryEntry = {
  slug: "roman-numeral-converter",
  name: "Roman Numeral Converter",
  module: "converters",
  description: "Convert between whole numbers and Roman numerals (1–3999), in both directions.",
  aliases: ["number to roman numeral", "roman numeral to number", "roman numerals converter"],
  icon: "ScrollText",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["roman numeral converter", "number to roman numerals", "roman numeral to number"] },
};
