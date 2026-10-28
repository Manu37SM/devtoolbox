import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ipv6AddressToolTool: ToolRegistryEntry = {
  slug: "ipv6-address-tool",
  name: "IPv6 Address Tool",
  module: "network",
  description: "Compress or expand IPv6 addresses (RFC 5952), identify the address type, extract IPv4-mapped addresses and generate the ip6.arpa reverse DNS name.",
  aliases: ["ipv6 compress","ipv6 expand","ip6.arpa","ipv6 shorten","ipv6 address type"],
  icon: "Globe",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ipv6 compress","ipv6 expand","ip6.arpa","ipv6 shorten","ipv6 address type"] },
};
