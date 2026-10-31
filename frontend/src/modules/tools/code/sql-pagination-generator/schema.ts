import { z } from "zod";

export const sqlPaginationGeneratorOptionsSchema = z.object({
  dialect: z.enum(["postgresql", "mysql", "sqlite", "oracle", "oracle11", "sqlserver", "db2"]).default("postgresql"),
  mode: z.enum(["page", "offset", "keyset"]).default("page"),
  page: z.number().int().min(1).max(1000000).default(1),
  pageSize: z.number().int().min(1).max(100000).default(20),
  offset: z.number().int().min(0).max(100000000).default(0),
  limit: z.number().int().min(1).max(100000).default(20),
  /** keyset: "created_at DESC, id DESC"; blank = use the query's own ORDER BY */
  keyColumns: z.string().default(""),
  /** keyset: last row's key values (comma separated) for the next-page query */
  after: z.string().default(""),
  params: z.enum(["literal", "question", "named", "dollar", "at"]).default("literal"),
  /** ORDER BY to add when the query has none */
  orderBy: z.string().default(""),
  /** fetch one extra row so the caller can tell whether another page exists */
  lookahead: z.boolean().default(false),
  countQuery: z.boolean().default(false),
});
export type SqlPaginationGeneratorOptions = z.infer<typeof sqlPaginationGeneratorOptionsSchema>;
