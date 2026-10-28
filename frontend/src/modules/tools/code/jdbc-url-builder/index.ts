import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jdbcUrlBuilderTool: ToolRegistryEntry = {
  slug: "jdbc-url-builder",
  name: "JDBC URL Builder & Parser",
  module: "code",
  description: "Build or parse JDBC connection URLs for Oracle (service name, SID, TNS), PostgreSQL, MySQL, MariaDB, SQL Server, Db2 and H2, with the matching driver class and Spring datasource properties.",
  aliases: ["oracle jdbc url","jdbc connection string","oracle service name vs sid","spring datasource url","parse jdbc url"],
  icon: "Database",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["oracle jdbc url","jdbc connection string","oracle service name vs sid","spring datasource url","parse jdbc url"] },
};
