import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const csvProfilerTool: ToolRegistryEntry = {
  slug: "csv-profiler",
  name: "CSV Profiler",
  module: "data-format",
  description: "Profile a CSV in your browser: infer column types, count missing and unique values, spot candidate keys, get min, max, mean, median and standard deviation, date ranges, top values and ragged rows.",
  aliases: ["csv column statistics","csv data quality check","csv schema inference","analyze csv file","csv summary"],
  icon: "Table2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["csv column statistics","csv data quality check","csv schema inference","analyze csv file","csv summary"] },
};
