import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const csvTsvTool: ToolRegistryEntry = {
  slug: "csv-tsv",
  name: "CSV ↔ TSV Converter",
  module: "data-format",
  description: "Convert between CSV and TSV, or clean messy delimited data by trimming cells and removing empty/duplicate rows.",
  aliases: ["csv to tsv", "tsv to csv", "csv cleaner", "tab separated values converter"],
  icon: "Table2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["csv to tsv converter", "tsv to csv converter", "clean csv data online"],
  },
};
