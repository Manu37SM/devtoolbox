import { z } from "zod";

export const nlToRegexOptionsSchema = z.object({
  prompt: z.string().min(1).max(1_000),
  examples: z.array(z.string().max(500)).max(10).optional(),
});
export type NlToRegexOptions = z.infer<typeof nlToRegexOptionsSchema>;
