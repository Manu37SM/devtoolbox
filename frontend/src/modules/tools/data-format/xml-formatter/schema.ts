import { z } from "zod";

export const xmlFormatterOptionsSchema = z.object({
  indent: z.union([z.literal(2), z.literal(4), z.literal("tab")]).default(2),
  mode: z.enum(["beautify", "minify"]).default("beautify"),
  /** Comments are kept by default; formatting should not delete content. */
  stripComments: z.boolean().default(false),
  /** Namespace declarations first, then the rest alphabetically. */
  sortAttributes: z.boolean().default(false),
  /** One attribute per line on elements with more than one attribute. */
  attributesPerLine: z.boolean().default(false),
  /** Write empty elements as <a></a> instead of <a />. */
  expandEmpty: z.boolean().default(false),
});
export type XmlFormatterOptions = z.infer<typeof xmlFormatterOptionsSchema>;

export const xmlFormatterInputSchema = z.string().max(5_000_000);
