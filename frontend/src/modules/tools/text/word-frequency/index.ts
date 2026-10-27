import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const wordFrequencyTool: ToolRegistryEntry = {
  slug: "word-frequency",
  name: "Word Frequency Counter",
  module: "text",
  description: "Count how often each word appears, with stop-word filtering, minimum length and top-N limits.",
  aliases: ["word counter by frequency","keyword density","most common words"],
  icon: "BarChart3",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["word counter by frequency","keyword density","most common words"] },
};
