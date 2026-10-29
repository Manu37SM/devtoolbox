import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const bigdecimalRoundingTool: ToolRegistryEntry = {
  slug: "bigdecimal-rounding",
  name: "Java BigDecimal Rounding Explorer",
  module: "code",
  description: "Compare all eight java.math.RoundingMode results for setScale, see the exact binary value behind new BigDecimal(double), and catch the 2.675 rounding trap before it reaches money code.",
  aliases: ["bigdecimal setscale","rounding mode half even","java money rounding","new bigdecimal double problem","bankers rounding"],
  icon: "Sigma",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["bigdecimal setscale","rounding mode half even","java money rounding","new bigdecimal double problem","bankers rounding"] },
};
