import { z } from "zod";

export const emailHeaderAnalyzerOptionsSchema = z.object({
  showAllHeaders: z.boolean().default(false),
});
export type EmailHeaderAnalyzerOptions = z.infer<typeof emailHeaderAnalyzerOptionsSchema>;
