import { z } from "zod";

export const csvToSqlInsertOptionsSchema = z.object({
  dialect: z.enum(["postgres", "mysql", "oracle", "sqlite", "sqlserver"]).default("postgres"),
  delimiter: z.enum([",", ";", "tab", "|"]).default(","),
  inferTypes: z.boolean().default(true),
  emptyAsNull: z.boolean().default(true),
  batchSize: z.number().int().min(1).max(1000).default(100),
});
export type CsvToSqlInsertOptions = z.infer<typeof csvToSqlInsertOptionsSchema>;
