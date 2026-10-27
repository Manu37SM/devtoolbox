import { z } from "zod";

export const jsonToSqlOptionsSchema = z.object({
  dialect: z.enum(["oracle", "postgres", "mysql", "sqlite", "sqlserver"]).default("oracle"),
  tableName: z.string().max(10000).default("my_table"),
  includeCreate: z.boolean().default(true),
  multiRow: z.boolean().default(false),
});
export type JsonToSqlOptions = z.infer<typeof jsonToSqlOptionsSchema>;

export const jsonToSqlInputSchema = z.string().max(1000000);
