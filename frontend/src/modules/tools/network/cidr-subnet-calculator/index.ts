import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cidrSubnetCalculatorTool: ToolRegistryEntry = {
  slug: "cidr-subnet-calculator",
  name: "CIDR/Subnet Calculator",
  module: "network",
  description: "Calculate network address, broadcast address, subnet mask, and host range from CIDR notation.",
  aliases: ["subnet calculator", "ip subnet calculator", "cidr calculator"],
  icon: "Network",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["cidr calculator online", "subnet calculator", "ip subnet mask calculator"] },
};
