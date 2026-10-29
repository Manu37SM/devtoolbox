import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const excelColumnConverterTool: ToolRegistryEntry = {
  slug: "excel-column-converter",
  name: "Excel Column & Cell Reference Converter",
  module: "converters",
  description: "Convert Excel column letters to numbers and back, A1 references to R1C1 and back, and size ranges like A1:C10, with 0-based indexes for Apache POI and openpyxl code.",
  aliases: ["excel column number","column letter to number","a1 to r1c1","excel column index","apache poi column index"],
  icon: "Sheet",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["excel column number","column letter to number","a1 to r1c1","excel column index","apache poi column index"] },
};
