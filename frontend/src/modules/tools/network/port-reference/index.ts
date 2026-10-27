import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const portReferenceTool: ToolRegistryEntry = {
  slug: "port-reference",
  name: "Port Reference",
  module: "network",
  description: "Look up well-known and developer ports by number, range or service name — databases, brokers, gateways and dev servers.",
  aliases: ["well known ports","port numbers","what runs on port","tcp udp ports"],
  icon: "Plug",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["well known ports","port numbers","what runs on port","tcp udp ports"] },
};
