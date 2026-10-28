import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const csvToSqlInsertTool: ToolRegistryEntry = {
  slug: "csv-to-sql-insert",
  name: "CSV to SQL INSERT Generator",
  module: "data-format",
  description: "Turn CSV into INSERT statements for PostgreSQL, MySQL, Oracle, SQLite or SQL Server with correct identifier quoting, string escaping, NULL handling and batched multi-row inserts.",
  aliases: ["csv to insert statements","import csv to sql","bulk insert generator","csv to postgres","csv to oracle insert"],
  icon: "Database",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["csv to insert statements","import csv to sql","bulk insert generator","csv to postgres","csv to oracle insert"] },
};
