import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonSortKeysTool: ToolRegistryEntry = {
  slug: "json-sort-keys",
  name: "JSON Key Sorter",
  module: "data-format",
  description: "Sort JSON object keys alphabetically, in reverse, by length or naturally (item2 before item10), recursively or top-level only, with optional array sorting. Great for stable diffs.",
  aliases: ["sort json keys","alphabetize json","canonical json","json normalize order","stable json diff"],
  icon: "ArrowDownAZ",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sort json keys","alphabetize json","canonical json","json normalize order","stable json diff"] },
};
