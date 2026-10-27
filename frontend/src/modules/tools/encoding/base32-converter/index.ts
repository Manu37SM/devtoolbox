import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const base32ConverterTool: ToolRegistryEntry = {
  slug: "base32-converter",
  name: "Base32 Encoder / Decoder",
  module: "encoding",
  description: "Encode text to Base32 and decode it back — RFC 4648, Base32hex and Crockford alphabets.",
  aliases: ["base32 encode", "base32 decode", "crockford base32", "base32hex"],
  icon: "Binary",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["base32 encoder", "base32 decoder", "base32 converter", "crockford base32"] },
};
