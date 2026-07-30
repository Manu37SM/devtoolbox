import { z } from "zod";

export const htmlBeautifierOptionsSchema = z.object({
  mode: z.enum(["beautify", "minify"]).default("beautify"),
  tabWidth: z.union([z.literal(2), z.literal(4)]).default(2),
});
export type HtmlBeautifierOptions = z.infer<typeof htmlBeautifierOptionsSchema>;

export const htmlBeautifierInputSchema = z.string().max(2_000_000);
