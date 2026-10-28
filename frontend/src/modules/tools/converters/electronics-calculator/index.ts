import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const electronicsCalculatorTool: ToolRegistryEntry = {
  slug: "electronics-calculator",
  name: "Electronics Calculator",
  module: "converters",
  description: "Ohm's law, LED series resistor with the next E24 value, voltage dividers, series and parallel resistors, RC time constant and cutoff, resistor colour codes and 555 astable timer frequency.",
  aliases: ["ohms law calculator","led resistor calculator","voltage divider calculator","resistor color code","555 timer frequency","rc time constant"],
  icon: "Zap",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ohms law calculator","led resistor calculator","voltage divider calculator","resistor color code","555 timer frequency","rc time constant"] },
};
