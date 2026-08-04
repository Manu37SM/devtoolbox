import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const hexTextTool: ToolRegistryEntry = {
  slug: "hex-text",
  name: "Hex ↔ Text Converter",
  module: "encoding",
  description: "Convert text to hexadecimal or binary and back, with correct handling of multi-byte Unicode characters.",
  aliases: ["hex to text", "text to hex", "binary to text", "text to binary"],
  icon: "Hash",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["hex to text converter", "text to hex converter", "binary text converter"],
  },
};
