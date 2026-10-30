import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sqlInsertParserTool: ToolRegistryEntry = {
  slug: "sql-insert-parser",
  name: "SQL INSERT to CSV/JSON",
  module: "data-format",
  description: "Extract rows from SQL INSERT statements (MySQL, PostgreSQL, Oracle INSERT ALL, SQL Server) into CSV, TSV, JSON or a Markdown table, handling quoting, escapes, NULLs and function values.",
  aliases: ["sql dump to csv", "insert statements to json", "parse sql insert", "sql values to csv", "extract data from sql dump"],
  icon: "DatabaseZap",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sql insert to csv/json", "sql dump to csv", "insert statements to json", "parse sql insert", "sql values to csv", "extract data from sql dump"] },
};
