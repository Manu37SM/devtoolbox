import { z } from "zod";

export const hashIdentifierOptionsSchema = z.object({
  showNotes: z.boolean().default(true),
});
export type HashIdentifierOptions = z.infer<typeof hashIdentifierOptionsSchema>;

export const hashIdentifierInputSchema = z.string().max(100_000);
