import { z } from "zod";

export const readabilityAnalyzerOptionsSchema = z.object({
  showFormulas: z.boolean().default(false),
});
export type ReadabilityAnalyzerOptions = z.infer<typeof readabilityAnalyzerOptionsSchema>;

export const readabilityAnalyzerInputSchema = z.string().max(2_000_000);
