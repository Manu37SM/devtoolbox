import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const mergeConflictResolverTool: ToolRegistryEntry = {
  slug: "merge-conflict-resolver",
  name: "Merge Conflict Resolver",
  module: "text",
  description: "Resolve Git merge conflict markers: keep ours, theirs, both or the diff3 base for all conflicts or one by one, auto-collapse identical sides, and get a report of every conflict.",
  aliases: ["git conflict", "resolve merge conflict", "conflict markers", "<<<<<<< HEAD", "diff3", "ours theirs"],
  icon: "GitMerge",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["merge conflict resolver", "git conflict", "resolve merge conflict", "conflict markers", "<<<<<<< HEAD", "diff3", "ours theirs"] },
};
