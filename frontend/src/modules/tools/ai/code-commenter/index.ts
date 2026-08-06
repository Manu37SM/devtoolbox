import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const codeCommenterTool: ToolRegistryEntry = {
  slug: "code-commenter",
  name: "Code Commenter / Docstring Generator",
  module: "ai",
  description: "Add inline comments and docstrings to a code snippet without changing the code itself.",
  aliases: ["docstring generator", "add comments to code", "jsdoc generator"],
  icon: "MessageSquareCode",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: {
    keywords: ["ai code commenter", "generate docstrings", "add jsdoc comments"],
  },
};

export { CodeCommenterToolView } from "./ToolView";
