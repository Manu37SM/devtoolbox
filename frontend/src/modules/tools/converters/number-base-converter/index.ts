import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const numberBaseConverterTool: ToolRegistryEntry = {
  slug: "number-base-converter",
  name: "Number Base Converter",
  module: "converters",
  description: "Convert numbers between binary, octal, decimal, and hexadecimal.",
  aliases: ["binary to decimal", "hex to decimal", "base converter"],
  icon: "Sigma",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["binary to decimal converter", "hex converter", "base converter online"] },
};
