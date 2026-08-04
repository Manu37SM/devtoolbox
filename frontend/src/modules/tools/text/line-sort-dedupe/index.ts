import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const lineSortDedupeTool: ToolRegistryEntry = {
  slug: "line-sort-dedupe",
  name: "Line Sort & Dedupe",
  module: "text",
  description: "Sort, deduplicate, shuffle, and trim lines of text.",
  aliases: ["remove duplicate lines", "sort lines alphabetically"],
  icon: "ListOrdered",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sort lines online", "remove duplicate lines", "dedupe text lines"] },
};
