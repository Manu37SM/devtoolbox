import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const macAddressToolTool: ToolRegistryEntry = {
  slug: "mac-address-tool",
  name: "MAC Address Tool",
  module: "network",
  description: "Reformat MAC addresses (colon, hyphen, Cisco dotted, plain), inspect unicast/multicast and local/universal bits, or generate random ones.",
  aliases: ["mac address formatter","mac address generator","mac converter","oui"],
  icon: "Cpu",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["mac address formatter","mac address generator","mac converter","oui"] },
};
