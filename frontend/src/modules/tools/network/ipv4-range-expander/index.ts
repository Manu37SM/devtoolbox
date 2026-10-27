import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ipv4RangeExpanderTool: ToolRegistryEntry = {
  slug: "ipv4-range-expander",
  name: "IPv4 Range ↔ CIDR",
  module: "network",
  description: "Turn an IP range into the minimal list of CIDR blocks, or expand a CIDR block into its first/last address and host counts.",
  aliases: ["ip range to cidr","cidr to ip range","cidr expander","firewall range to cidr"],
  icon: "Split",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ip range to cidr","cidr to ip range","cidr expander","firewall range to cidr"] },
};
