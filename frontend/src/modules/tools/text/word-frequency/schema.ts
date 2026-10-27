import { z } from "zod";

export const wordFrequencyOptionsSchema = z.object({
  sortBy: z.enum(["count", "alpha"]).default("count"),
  topN: z.number().int().min(0).max(10000).default(0),
  minLength: z.number().int().min(1).max(50).default(1),
  ignoreStopWords: z.boolean().default(false),
  caseSensitive: z.boolean().default(false),
});
export type WordFrequencyOptions = z.infer<typeof wordFrequencyOptionsSchema>;

export const wordFrequencyInputSchema = z.string().max(1000000);
