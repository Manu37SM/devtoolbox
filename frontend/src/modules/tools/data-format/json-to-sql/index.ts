import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonToSqlTool: ToolRegistryEntry = {
  slug: "json-to-sql",
  name: "JSON to SQL INSERT",
  module: "data-format",
  description: "Turn a JSON array of objects into CREATE TABLE and INSERT statements for Oracle, PostgreSQL, MySQL, SQLite or SQL Server.",
  aliases: ["json to insert statements","json to oracle sql","json to create table","json to sql"],
  icon: "Database",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json to insert statements","json to oracle sql","json to create table","json to sql"] },
};
