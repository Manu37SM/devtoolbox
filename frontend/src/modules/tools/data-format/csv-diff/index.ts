import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const csvDiffTool: ToolRegistryEntry = {
  slug: "csv-diff",
  name: "CSV Diff",
  module: "data-format",
  description: "Compare two CSV files by key column or whole row and see added, removed and changed rows with per-cell differences, ignoring columns, case, whitespace or small numeric changes.",
  aliases: ["compare csv", "csv compare", "csv difference", "spreadsheet diff", "diff two csv files"],
  icon: "GitCompareArrows",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["csv diff", "compare csv", "csv compare", "csv difference", "spreadsheet diff", "diff two csv files"] },
};
