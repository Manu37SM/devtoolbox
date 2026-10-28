import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const asciiTableParserTool: ToolRegistryEntry = {
  slug: "ascii-table-parser",
  name: "ASCII Table Parser",
  module: "data-format",
  description: "Turn terminal tables into JSON, CSV, TSV, YAML or Markdown: MySQL and psql output, kubectl and docker ps columns, Markdown pipes and Unicode box-drawing tables.",
  aliases: ["kubectl output to json","mysql table to csv","psql output to json","docker ps to json","box drawing table parser"],
  icon: "Table",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["kubectl output to json","mysql table to csv","psql output to json","docker ps to json","box drawing table parser"] },
};
