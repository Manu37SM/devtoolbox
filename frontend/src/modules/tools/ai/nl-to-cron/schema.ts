import { z } from "zod";

export const nlToCronOptionsSchema = z.object({
  prompt: z.string().min(1).max(1_000),
});
export type NlToCronOptions = z.infer<typeof nlToCronOptionsSchema>;
