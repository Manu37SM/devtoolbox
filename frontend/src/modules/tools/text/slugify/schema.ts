import { z } from "zod";

export const slugifySeparatorSchema = z.enum(["-", "_"]);
export type SlugifySeparator = z.infer<typeof slugifySeparatorSchema>;

export const slugifyOptionsSchema = z.object({
  separator: slugifySeparatorSchema.default("-"),
  lowercase: z.boolean().default(true),
  transliterate: z.boolean().default(true),
  maxLength: z.number().int().positive().optional(),
});
export type SlugifyOptions = z.infer<typeof slugifyOptionsSchema>;

export const slugifyInputSchema = z.string().max(1_000_000);
