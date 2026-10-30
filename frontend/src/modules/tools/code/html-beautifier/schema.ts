import { z } from "zod";

export const htmlBeautifierOptionsSchema = z.object({
  mode: z.enum(["beautify", "minify"]).default("beautify"),
  tabWidth: z.union([z.literal(2), z.literal(4)]).default(2),
  useTabs: z.boolean().default(false),
  printWidth: z.union([z.literal(80), z.literal(100), z.literal(120), z.literal(160)]).default(80),
  /** "css" respects inline elements like browsers do; "ignore" reflows freely; "strict" never touches whitespace. */
  whitespace: z.enum(["css", "strict", "ignore"]).default("css"),
  singleAttributePerLine: z.boolean().default(false),
  /** Put the closing > of a multi-line start tag on the last attribute line. */
  bracketSameLine: z.boolean().default(false),
  /** Minify: keep comments (conditional comments, licence headers). */
  keepComments: z.boolean().default(false),
});
export type HtmlBeautifierOptions = z.infer<typeof htmlBeautifierOptionsSchema>;

export const htmlBeautifierInputSchema = z.string().max(2_000_000);
