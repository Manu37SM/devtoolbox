import { z } from "zod";

export const httpHeaderAnalyzerOptionsSchema = z.object({
  security: z.boolean().default(true),
});
export type HttpHeaderAnalyzerOptions = z.infer<typeof httpHeaderAnalyzerOptionsSchema>;

export const httpHeaderAnalyzerInputSchema = z.string().max(1000000);
