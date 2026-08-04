import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonDiffTool: ToolRegistryEntry = {
  slug: "json-diff",
  name: "JSON Diff",
  module: "data-format",
  description: "Compare two JSON documents structurally and see added, removed, and changed fields.",
  aliases: ["json compare", "json comparison", "compare json files"],
  icon: "GitCompare",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["json diff", "json compare tool", "compare two json files", "json comparison online"],
  },
};
