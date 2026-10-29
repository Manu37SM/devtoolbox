import { z } from "zod";

export const sqlInClauseBuilderOptionsSchema = z.object({
  format: z.enum(["in", "or-chunks", "values", "union-all", "insert"]).default("or-chunks"),
  quoting: z.enum(["auto", "string", "number"]).default("auto"),
  chunkSize: z.number().int().min(1).max(100000).default(1000),
  column: z.string().default("id"),
  dedupe: z.boolean().default(true),
});
export type SqlInClauseBuilderOptions = z.infer<typeof sqlInClauseBuilderOptionsSchema>;
