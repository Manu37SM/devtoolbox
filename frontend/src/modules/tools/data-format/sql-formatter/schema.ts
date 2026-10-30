import { z } from "zod";

export const SQL_DIALECT_IDS = ["sql", "plsql", "postgresql", "mysql", "mariadb", "transactsql", "db2", "db2i", "sqlite", "bigquery", "snowflake", "redshift", "spark", "hive", "trino", "duckdb", "clickhouse", "tidb", "singlestoredb", "n1ql"] as const;
export type SqlDialect = (typeof SQL_DIALECT_IDS)[number];

export const SQL_DIALECT_LABELS: Record<SqlDialect, string> = {
  sql: "Standard SQL",
  plsql: "Oracle PL/SQL",
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mariadb: "MariaDB",
  transactsql: "SQL Server (T-SQL)",
  db2: "IBM Db2",
  db2i: "IBM Db2 for i",
  sqlite: "SQLite",
  bigquery: "BigQuery",
  snowflake: "Snowflake",
  redshift: "Amazon Redshift",
  spark: "Spark SQL",
  hive: "Hive",
  trino: "Trino / Presto",
  duckdb: "DuckDB",
  clickhouse: "ClickHouse",
  tidb: "TiDB",
  singlestoredb: "SingleStore",
  n1ql: "Couchbase N1QL",
};

const caseEnum = z.enum(["preserve", "upper", "lower"]);

export const sqlFormatterOptionsSchema = z.object({
  dialect: z.enum(SQL_DIALECT_IDS).default("sql"),
  keywordCase: caseEnum.default("upper"),
  tabWidth: z.number().default(2),
  useTabs: z.boolean().default(false),
  functionCase: caseEnum.default("preserve"),
  dataTypeCase: caseEnum.default("preserve"),
  /** "tabularLeft" aligns clause keywords in a 10-character column, as many DBA style guides do. */
  indentStyle: z.enum(["standard", "tabularLeft", "tabularRight"]).default("standard"),
  /** Put AND / OR at the start of the line ("before") or the end ("after"). */
  logicalOperatorNewline: z.enum(["before", "after"]).default("before"),
  /** Parenthesised expressions shorter than this stay on one line. */
  expressionWidth: z.number().int().min(10).max(200).default(50),
  linesBetweenQueries: z.number().int().min(0).max(5).default(1),
  /** a=b instead of a = b. */
  denseOperators: z.boolean().default(false),
  newlineBeforeSemicolon: z.boolean().default(false),
});
export type SqlFormatterOptions = z.infer<typeof sqlFormatterOptionsSchema>;

export const sqlFormatterInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
