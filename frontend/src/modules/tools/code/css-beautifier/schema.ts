import { z } from "zod";

export const cssBeautifierOptionsSchema = z.object({
  mode: z.enum(["beautify", "minify"]).default("beautify"),
  tabWidth: z.union([z.literal(2), z.literal(4)]).default(2),
});
export type CssBeautifierOptions = z.infer<typeof cssBeautifierOptionsSchema>;

export const cssBeautifierInputSchema = z.string().max(2_000_000);
