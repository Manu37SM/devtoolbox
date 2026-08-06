import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const aiCommitMessageTool: ToolRegistryEntry = {
  slug: "ai-commit-message",
  name: "AI Commit Message / PR Description Generator",
  module: "ai",
  description: "Paste a diff and get a conventional-commits-style commit message plus a PR description.",
  aliases: ["commit message generator", "pr description generator", "diff to commit message"],
  icon: "GitCommitHorizontal",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: {
    keywords: ["ai commit message generator", "generate pr description from diff", "conventional commits generator"],
  },
};

export { AiCommitMessageToolView } from "./ToolView";
