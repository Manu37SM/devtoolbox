import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ipv4AddressConverterTool: ToolRegistryEntry = {
  slug: "ipv4-address-converter",
  name: "IPv4 Address Converter",
  module: "network",
  description: "Convert an IPv4 address between dotted, integer, hex, binary and octal, with IPv4-mapped IPv6, reverse DNS and range classification.",
  aliases: ["ip to decimal","ip to hex","ip to binary","decimal to ip","ipv4 to integer"],
  icon: "Network",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ip to decimal","ip to hex","ip to binary","decimal to ip","ipv4 to integer"] },
};
