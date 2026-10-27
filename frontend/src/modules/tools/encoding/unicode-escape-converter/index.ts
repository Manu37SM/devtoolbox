import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const unicodeEscapeConverterTool: ToolRegistryEntry = {
  slug: "unicode-escape-converter",
  name: "Unicode Escape Converter",
  module: "encoding",
  description: "Escape text to \\uXXXX, \\u{…}, U+XXXX or HTML entities, and unescape any of them back to text.",
  aliases: ["unicode escape", "unicode unescape", "\\u escape", "code point converter"],
  icon: "Languages",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["unicode escape converter", "unicode to text", "text to unicode escape", "u+ code point"] },
};
