import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ipCidrMatcherTool: ToolRegistryEntry = {
  slug: "ip-cidr-matcher",
  name: "IP / CIDR Range Matcher",
  module: "network",
  description: "Check which CIDR ranges contain each IP address, IPv4 and IPv6, and pick the most specific match. Handy for allowlists, firewall rules and cloud security groups.",
  aliases: ["ip in cidr","cidr contains ip","allowlist checker","ip range match","subnet membership"],
  icon: "Network",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ip in cidr","cidr contains ip","allowlist checker","ip range match","subnet membership"] },
};
