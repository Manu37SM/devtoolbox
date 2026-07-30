import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const randomGeneratorTool: ToolRegistryEntry = {
  slug: "random-generator",
  name: "Random Number/String Generator",
  module: "generators",
  description: "Generate random numbers or strings in bulk, with configurable range/charset.",
  aliases: ["random number generator", "random string generator"],
  icon: "Dices",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["random number generator online", "random string generator"] },
};
