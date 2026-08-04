import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sqlFormatterTool: ToolRegistryEntry = {
  slug: "sql-formatter",
  name: "SQL Formatter",
  module: "data-format",
  description: "Beautify or minify SQL queries with configurable dialect, keyword case, and indentation.",
  aliases: ["sql beautifier", "sql pretty print", "sql minifier", "format sql query"],
  icon: "Database",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["sql formatter", "sql beautifier", "format sql online", "sql pretty print"],
  },
};
