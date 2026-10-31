import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const csvPivotTool: ToolRegistryEntry = {
  slug: "csv-pivot",
  name: "CSV Pivot & Group By",
  module: "data-format",
  description: "Group CSV rows by one or more columns and aggregate others with count, sum, average, min, max, median, distinct or concat, or pivot a column into headers.",
  aliases: ["group by csv", "pivot table", "aggregate csv", "sum by column", "crosstab", "csv summary", "group by count"],
  icon: "Rows3",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["csv pivot & group by", "group by csv", "pivot table", "aggregate csv", "sum by column", "crosstab", "csv summary", "group by count"] },
};
