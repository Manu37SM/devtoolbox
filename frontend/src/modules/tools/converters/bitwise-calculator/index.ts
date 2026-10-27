import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const bitwiseCalculatorTool: ToolRegistryEntry = {
  slug: "bitwise-calculator",
  name: "Bitwise Calculator",
  module: "converters",
  description: "AND, OR, XOR, NOT and shifts on 8/16/32/64-bit integers, in decimal, hex, binary or octal, with signed and unsigned results.",
  aliases: ["bitwise operations","bit shift calculator","xor calculator","hex and binary calculator"],
  icon: "Binary",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["bitwise operations","bit shift calculator","xor calculator","hex and binary calculator"] },
};
