import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const conventionalCommitLinterTool: ToolRegistryEntry = {
  slug: "conventional-commit-linter",
  name: "Conventional Commit Linter",
  module: "code",
  description: "Validate a commit message against the Conventional Commits spec: type, scope, breaking-change markers, header length, imperative mood and footers, plus the SemVer bump it implies.",
  aliases: ["commitlint","conventional commits validator","commit message format","semantic release bump","feat fix chore"],
  icon: "GitCommitHorizontal",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["commitlint","conventional commits validator","commit message format","semantic release bump","feat fix chore"] },
};
