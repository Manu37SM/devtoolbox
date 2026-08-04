import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const unitConverterTool: ToolRegistryEntry = {
  slug: "unit-converter",
  name: "Unit Converter",
  module: "converters",
  description: "Convert between data size, time, length, and weight units.",
  aliases: ["measurement converter", "data size converter", "length converter"],
  icon: "Ruler",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["unit converter", "data size converter", "convert units online"] },
};
