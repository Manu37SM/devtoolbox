import { z } from "zod";

export const jsonDiffOptionsSchema = z.object({
  ignoreArrayOrder: z.boolean().default(false),
});
export type JsonDiffOptions = z.infer<typeof jsonDiffOptionsSchema>;

export const jsonDiffInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
