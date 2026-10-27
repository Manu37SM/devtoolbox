import { z } from "zod";

export const readingTimeEstimatorOptionsSchema = z.object({
  wpm: z.number().int().min(50).max(1000).default(200),
  stripMarkdown: z.boolean().default(false),
  countImages: z.boolean().default(false),
});
export type ReadingTimeEstimatorOptions = z.infer<typeof readingTimeEstimatorOptionsSchema>;

export const readingTimeEstimatorInputSchema = z.string().max(1000000);
