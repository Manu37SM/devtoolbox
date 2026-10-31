import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sqlDataTypeMapperTool: ToolRegistryEntry = {
  slug: "sql-data-type-mapper",
  name: "SQL DDL Dialect & Data Type Mapper",
  module: "code",
  description: "Convert CREATE TABLE DDL between Oracle, PostgreSQL, MySQL, SQL Server, SQLite and Db2, or list each column's cross-database, Java, JDBC and TypeScript types, flagging lossy conversions.",
  aliases: ["sql type mapping", "oracle to postgres", "number to numeric", "varchar2 to varchar", "ddl converter", "mysql to postgresql", "sql server to oracle", "migrate schema types"],
  icon: "ArrowLeftRight",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sql ddl dialect & data type mapper", "sql type mapping", "oracle to postgres", "number to numeric", "varchar2 to varchar", "ddl converter", "mysql to postgresql", "sql server to oracle", "migrate schema types"] },
};
