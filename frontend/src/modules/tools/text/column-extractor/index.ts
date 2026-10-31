import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const columnExtractorTool: ToolRegistryEntry = {
  slug: "column-extractor",
  name: "Column Extractor",
  module: "text",
  description: "Pick, reorder, drop and join columns from delimited or whitespace-aligned text, like cut and awk, with ranges, regex splits, negative indexes and header handling.",
  aliases: ["awk print", "cut -f", "extract column", "reorder columns", "split by delimiter", "select fields", "whitespace columns"],
  icon: "Columns3",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["column extractor", "awk print", "cut -f", "extract column", "reorder columns", "split by delimiter", "select fields", "whitespace columns"] },
};
