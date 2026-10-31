import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const firewallRuleBuilderTool: ToolRegistryEntry = {
  slug: "firewall-rule-builder",
  name: "Firewall Rule Builder",
  module: "network",
  description: "Turn simple allow and deny rules into ufw, iptables, nftables or firewalld commands with default policies, protocols, ports, source ranges and logging options.",
  aliases: ["iptables generator", "ufw rules", "nftables ruleset", "firewalld rich rule", "open port linux", "firewall config"],
  icon: "ShieldCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["firewall rule builder", "iptables generator", "ufw rules", "nftables ruleset", "firewalld rich rule", "open port linux", "firewall config"] },
};
