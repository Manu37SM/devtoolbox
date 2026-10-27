import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const indianNumberSystemConverterTool: ToolRegistryEntry = {
  slug: "indian-number-system-converter",
  name: "Indian Number System (Lakh / Crore)",
  module: "converters",
  description: "Format numbers in lakh/crore grouping (12,34,567) vs international grouping, with amounts in words — handy for rupee amounts and cheque writing.",
  aliases: ["lakh crore converter","indian number format","rupees in words","indian comma format"],
  icon: "IndianRupee",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["lakh crore converter","indian number format","rupees in words","indian comma format"] },
};
