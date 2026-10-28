import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cidrAggregatorTool: ToolRegistryEntry = {
  slug: "cidr-aggregator",
  name: "CIDR Aggregator",
  module: "network",
  description: "Merge a list of IPv4 and IPv6 addresses and CIDR blocks into the smallest set of CIDRs, removing overlaps and joining adjacent ranges. Ideal for firewall rules, allow-lists and security groups.",
  aliases: ["merge cidr ranges","summarize ip ranges","supernet calculator","firewall rule optimizer","aggregate subnets"],
  icon: "Network",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["merge cidr ranges","summarize ip ranges","supernet calculator","firewall rule optimizer","aggregate subnets"] },
};
