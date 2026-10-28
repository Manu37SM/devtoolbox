import { z } from "zod";

export const accessLogAnalyzerOptionsSchema = z.object({
  topN: z.number().int().min(1).max(100).default(10),
  ignoreQuery: z.boolean().default(true),
});
export type AccessLogAnalyzerOptions = z.infer<typeof accessLogAnalyzerOptionsSchema>;

export const accessLogAnalyzerInputSchema = z.string().max(20_000_000);
