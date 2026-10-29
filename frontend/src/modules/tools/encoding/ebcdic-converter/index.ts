import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ebcdicConverterTool: ToolRegistryEntry = {
  slug: "ebcdic-converter",
  name: "EBCDIC to ASCII Converter",
  module: "encoding",
  description: "Convert between text and EBCDIC bytes for mainframe code pages 037, 1047, 500, 1140 (euro) and 273, with newline mapping and a list of characters that do not exist in the code page.",
  aliases: ["ebcdic decoder","cp037 converter","ibm-1047 to ascii","mainframe text conversion","ebcdic hex to text"],
  icon: "Server",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ebcdic decoder","cp037 converter","ibm-1047 to ascii","mainframe text conversion","ebcdic hex to text"] },
};
