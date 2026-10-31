import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const reverseDnsNameGeneratorTool: ToolRegistryEntry = {
  slug: "reverse-dns-name-generator",
  name: "Reverse DNS (PTR) Name Generator",
  module: "network",
  description: "Turn IPv4 and IPv6 addresses or CIDR blocks into in-addr.arpa and ip6.arpa PTR names and delegation zones, including RFC 2317 classless zones and BIND zone snippets.",
  aliases: ["ptr record", "in-addr.arpa", "ip6.arpa", "reverse zone", "rfc 2317", "reverse dns"],
  icon: "Undo2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["reverse dns (ptr) name generator", "ptr record", "in-addr.arpa", "ip6.arpa", "reverse zone", "rfc 2317", "reverse dns"] },
};
