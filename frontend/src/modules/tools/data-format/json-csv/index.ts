import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonCsvTool: ToolRegistryEntry = {
  slug: "json-csv",
  name: "JSON ↔ CSV",
  module: "data-format",
  description: "Convert a JSON array of objects to CSV and back, with nested-object flattening.",
  aliases: ["json to csv", "csv to json", "json csv converter"],
  icon: "Table",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["json to csv converter", "csv to json converter online"] },
};
