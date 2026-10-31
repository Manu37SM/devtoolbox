import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const base85UuencodeConverterTool: ToolRegistryEntry = {
  slug: "base85-uuencode-converter",
  name: "Base85, Ascii85 & uuencode Converter",
  module: "encoding",
  description: "Encode and decode Ascii85 (Adobe and btoa), RFC 1924 Base85, Z85 and uuencode, with line wrapping, delimiters and hex or text input for PDF, PostScript and legacy mail payloads.",
  aliases: ["ascii85", "a85", "base85", "z85", "rfc1924", "uuencode", "uudecode", "btoa"],
  icon: "Binary",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["base85, ascii85 & uuencode converter", "ascii85", "a85", "base85", "z85", "rfc1924", "uuencode", "uudecode", "btoa"] },
};
