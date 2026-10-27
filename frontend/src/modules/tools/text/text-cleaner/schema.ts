import { z } from "zod";

export const textCleanerOptionsSchema = z.object({
  trimLines: z.boolean().default(true),
  collapseSpaces: z.boolean().default(true),
  removeEmptyLines: z.boolean().default(false),
  collapseEmptyLines: z.boolean().default(false),
  stripHtml: z.boolean().default(false),
  removeAccents: z.boolean().default(false),
  straightenQuotes: z.boolean().default(false),
  removeInvisible: z.boolean().default(true),
});
export type TextCleanerOptions = z.infer<typeof textCleanerOptionsSchema>;

export const textCleanerInputSchema = z.string().max(1000000);
