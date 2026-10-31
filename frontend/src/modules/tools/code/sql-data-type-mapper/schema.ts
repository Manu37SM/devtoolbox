import { z } from "zod";

const dialect = z.enum(["oracle", "postgresql", "mysql", "sqlserver", "sqlite", "db2"]);

export const sqlDataTypeMapperOptionsSchema = z.object({
  from: z.enum(["auto", "oracle", "postgresql", "mysql", "sqlserver", "sqlite", "db2"]).default("auto"),
  to: dialect.default("postgresql"),
  /** ddl: converted CREATE TABLE; types: per-column type table incl. Java / JDBC / TypeScript */
  mode: z.enum(["ddl", "types"]).default("ddl"),
  /** Oracle NUMBER(p,0): smart picks smallint / integer / bigint by precision */
  integers: z.enum(["smart", "numeric"]).default("smart"),
  /** Treat Oracle NUMBER(1) as boolean */
  numberOneAsBoolean: z.boolean().default(false),
  /** Prefer Unicode types (nvarchar...) when the target has them */
  unicode: z.boolean().default(false),
  /** json → jsonb on PostgreSQL */
  jsonb: z.boolean().default(true),
  /** Target supports a native boolean (Oracle 23ai) */
  oracleBoolean: z.boolean().default(false),
  /** Identifier handling */
  identifiers: z.enum(["keep", "lower", "upper"]).default("keep"),
  /** Quote every identifier in the output */
  quoteAll: z.boolean().default(false),
  /** Keep storage clauses, comments and other source-specific extras in the output as comments */
  notesAsComments: z.boolean().default(true),
});
export type SqlDataTypeMapperOptions = z.infer<typeof sqlDataTypeMapperOptionsSchema>;
