import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ipv6UlaGeneratorTool: ToolRegistryEntry = {
  slug: "ipv6-ula-generator",
  name: "IPv6 ULA Generator",
  module: "network",
  description: "Generate RFC 4193 unique local IPv6 /48 prefixes (fd00::/8) with example /64 subnets for private networks.",
  aliases: ["ula prefix","rfc 4193","private ipv6 prefix","fd00::/8"],
  icon: "Fingerprint",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ula prefix","rfc 4193","private ipv6 prefix","fd00::/8"] },
};
