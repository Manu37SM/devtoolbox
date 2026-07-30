import { z } from "zod";

export const jsTsBeautifierOptionsSchema = z.object({
  mode: z.enum(["beautify", "minify"]).default("beautify"),
  language: z.enum(["javascript", "typescript"]).default("javascript"),
  semi: z.boolean().default(true),
  singleQuote: z.boolean().default(false),
  tabWidth: z.union([z.literal(2), z.literal(4)]).default(2),
});
export type JsTsBeautifierOptions = z.infer<typeof jsTsBeautifierOptionsSchema>;

export const jsTsBeautifierInputSchema = z.string().max(2_000_000);
