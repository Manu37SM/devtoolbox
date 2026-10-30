import { z } from "zod";

export const cssBeautifierOptionsSchema = z.object({
  mode: z.enum(["beautify", "minify"]).default("beautify"),
  tabWidth: z.union([z.literal(2), z.literal(4)]).default(2),
  useTabs: z.boolean().default(false),
  printWidth: z.union([z.literal(80), z.literal(100), z.literal(120)]).default(80),
  singleQuote: z.boolean().default(false),
  /** Minify: let csso merge and reorder rules (its default). Turn off if rule order matters in edge cases. */
  restructure: z.boolean().default(true),
  /** Minify: keep /*! licence comments. */
  keepLicenseComments: z.boolean().default(true),
});
export type CssBeautifierOptions = z.infer<typeof cssBeautifierOptionsSchema>;

export const cssBeautifierInputSchema = z.string().max(2_000_000);
