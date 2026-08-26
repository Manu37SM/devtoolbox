import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const placeholderTextGeneratorTool: ToolRegistryEntry = {
  slug: "placeholder-text-generator",
  name: "Placeholder Text (Hipster/Corporate/Bacon)",
  module: "generators",
  description: "Generate Hipster ipsum, Corporate buzzword ipsum, or Bacon ipsum placeholder text.",
  aliases: ["hipster ipsum", "corporate ipsum", "bacon ipsum"],
  icon: "Type",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["hipster ipsum generator", "corporate ipsum", "bacon ipsum generator"] },
};
