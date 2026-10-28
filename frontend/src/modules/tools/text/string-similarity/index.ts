import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const stringSimilarityTool: ToolRegistryEntry = {
  slug: "string-similarity",
  name: "String Similarity (Levenshtein, Jaro-Winkler, Dice)",
  module: "text",
  description: "Compare strings with Levenshtein, Damerau-Levenshtein, Jaro, Jaro-Winkler, Dice, Jaccard, longest common subsequence and Soundex. The first line is compared with every other line.",
  aliases: ["levenshtein distance","edit distance calculator","jaro winkler","fuzzy match score","soundex"],
  icon: "GitCompare",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["levenshtein distance","edit distance calculator","jaro winkler","fuzzy match score","soundex"] },
};
