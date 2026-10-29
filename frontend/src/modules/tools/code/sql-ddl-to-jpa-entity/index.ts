import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sqlDdlToJpaEntityTool: ToolRegistryEntry = {
  slug: "sql-ddl-to-jpa-entity",
  name: "SQL DDL to JPA Entity",
  module: "code",
  description: "Generate Jakarta or javax JPA entities, or Java records, from CREATE TABLE statements for Oracle, PostgreSQL and MySQL, with type mapping, identity or sequence ids, composite keys and relations.",
  aliases: ["create table to entity","ddl to java class","oracle table to jpa","hibernate entity generator","sql to java pojo"],
  icon: "TableProperties",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["create table to entity","ddl to java class","oracle table to jpa","hibernate entity generator","sql to java pojo"] },
};
