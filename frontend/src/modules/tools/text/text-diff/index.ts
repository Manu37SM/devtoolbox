import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const textDiffTool: ToolRegistryEntry = {
  slug: "text-diff",
  name: "Text Diff Checker",
  module: "text",
  description: "Compare two blocks of text side-by-side with line, word, or character-level diffing.",
  aliases: ["text compare", "diff checker", "compare two texts"],
  icon: "GitCompare",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["text diff checker", "compare text online", "diff tool"] },
};
