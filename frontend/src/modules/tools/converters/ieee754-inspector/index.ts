import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ieee754InspectorTool: ToolRegistryEntry = {
  slug: "ieee754-inspector",
  name: "IEEE 754 Float Inspector",
  module: "converters",
  description: "See the sign, exponent and mantissa bits of a number as float32 or float64, or decode a hex pattern. Explains why 0.1 + 0.2 ≠ 0.3.",
  aliases: ["floating point converter","float to binary","ieee 754 converter","float32 float64"],
  icon: "Binary",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["floating point converter","float to binary","ieee 754 converter","float32 float64"] },
};
