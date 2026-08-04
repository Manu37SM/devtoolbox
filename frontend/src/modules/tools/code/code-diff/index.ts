import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const codeDiffTool: ToolRegistryEntry = {
  slug: "code-diff",
  name: "Code Diff Checker",
  module: "code",
  description: "Compare two versions of source code with syntax-highlighted, line-by-line diffing.",
  aliases: ["source diff", "code compare", "diff two files"],
  icon: "GitCompare",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["code diff checker", "compare code online", "source code diff"] },
};
