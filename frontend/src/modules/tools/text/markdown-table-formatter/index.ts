import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const markdownTableFormatterTool: ToolRegistryEntry = {
  slug: "markdown-table-formatter",
  name: "Markdown Table Formatter",
  module: "text",
  description: "Align and tidy messy Markdown tables, or convert CSV and TSV into a clean table. Control column alignment, keep or force it, and measure wide characters correctly.",
  aliases: ["csv to markdown table","format markdown table","align table columns","tsv to markdown","github table"],
  icon: "Table",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["csv to markdown table","format markdown table","align table columns","tsv to markdown","github table"] },
};
