import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const csvJoinTool: ToolRegistryEntry = {
  slug: "csv-join",
  name: "CSV Join",
  module: "data-format",
  description: "SQL-style join of two CSV files on one or more key columns: inner, left, right, full outer or anti join, with column suffixes, key matching options and column selection.",
  aliases: ["merge csv", "vlookup csv", "csv merge", "join two csv files", "csv left join", "csv lookup"],
  icon: "Merge",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["csv join", "merge csv", "vlookup csv", "csv merge", "join two csv files", "csv left join", "csv lookup"] },
};
