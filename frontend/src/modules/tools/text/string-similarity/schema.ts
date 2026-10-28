import { z } from "zod";

export const stringSimilarityOptionsSchema = z.object({
  ignoreCase: z.boolean().default(true),
});
export type StringSimilarityOptions = z.infer<typeof stringSimilarityOptionsSchema>;

export const stringSimilarityInputSchema = z.string().max(20_000);
