import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const binaryTextConverterTool: ToolRegistryEntry = {
  slug: "binary-text-converter",
  name: "Text ↔ Binary / Octal / Decimal",
  module: "encoding",
  description: "Convert text to its UTF-8 bytes in binary, octal or decimal, and back. Handles emoji and non-Latin scripts.",
  aliases: ["text to binary","binary to text","ascii to binary","text to decimal"],
  icon: "Binary",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["text to binary","binary to text","ascii to binary","text to decimal"] },
};
