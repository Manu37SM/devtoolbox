import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const textTableTool: ToolRegistryEntry = {
  slug: "text-table",
  name: "Text Table Converter",
  module: "text",
  description: "Convert tables between Markdown, CSV, TSV, and ASCII box-drawing formats.",
  aliases: ["csv to markdown table", "markdown table generator"],
  icon: "Table",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["csv to markdown table", "markdown table generator", "csv to ascii table"] },
};
