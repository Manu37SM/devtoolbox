import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sqlPaginationGeneratorTool: ToolRegistryEntry = {
  slug: "sql-pagination-generator",
  name: "SQL Pagination Query Generator",
  module: "code",
  description: "Wrap any SELECT in paging SQL for PostgreSQL, MySQL, SQLite, Oracle 11g/12c+, SQL Server and DB2: offset or keyset (seek) pages, bind-parameter styles, look-ahead row and a matching count query.",
  aliases: ["sql pagination", "limit offset", "keyset pagination", "seek method", "fetch next rows only", "rownum pagination", "offset fetch", "top n paging"],
  icon: "ListFilter",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sql pagination query generator", "sql pagination", "limit offset", "keyset pagination", "seek method", "fetch next rows only", "rownum pagination", "offset fetch", "top n paging"] },
};
