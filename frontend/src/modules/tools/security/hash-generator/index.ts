import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const hashGeneratorTool: ToolRegistryEntry = {
  slug: "hash-generator",
  name: "Hash Generator",
  module: "security",
  description: "Generate MD5, SHA-1, SHA-256, or SHA-512 hashes from text, entirely client-side.",
  aliases: ["md5 generator", "sha256 generator", "checksum generator"],
  icon: "Fingerprint",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["md5 hash generator", "sha256 hash generator", "sha1 online"] },
};
