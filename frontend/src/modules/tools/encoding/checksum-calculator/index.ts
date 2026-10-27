import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const checksumCalculatorTool: ToolRegistryEntry = {
  slug: "checksum-calculator",
  name: "Checksum Calculator (CRC32, Adler-32)",
  module: "encoding",
  description: "Compute CRC-32, CRC-32C, CRC-16, Adler-32 and Fletcher-16 checksums of text or hex bytes. For integrity checks — not security.",
  aliases: ["crc32","crc32c","adler32","checksum online","crc16"],
  icon: "ShieldCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["crc32","crc32c","adler32","checksum online","crc16"] },
};
