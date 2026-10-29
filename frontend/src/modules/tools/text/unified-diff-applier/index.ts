import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const unifiedDiffApplierTool: ToolRegistryEntry = {
  slug: "unified-diff-applier",
  name: "Patch Applier (Unified Diff)",
  module: "text",
  description: "Apply a unified diff from git diff or diff -u to text in the browser, finding hunks that moved, reversing patches and reporting exactly which hunks failed.",
  aliases: ["apply patch online","git apply online","unified diff apply","reverse patch","patch file tool"],
  icon: "GitPullRequestArrow",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["apply patch online","git apply online","unified diff apply","reverse patch","patch file tool"] },
};
