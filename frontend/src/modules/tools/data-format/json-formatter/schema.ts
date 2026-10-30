import { z } from "zod";

export const jsonFormatterOptionsSchema = z.object({
  indent: z.union([z.literal(2), z.literal(4), z.literal("tab")]).default(2),
  sortKeys: z.boolean().default(false),
  mode: z.enum(["beautify", "minify"]).default("beautify"),
  /** Write non-ASCII characters as \uXXXX escapes. */
  escapeUnicode: z.boolean().default(false),
  /** Keep arrays of plain values (ports, IDs, tags) on one line when they fit in 80 columns. */
  inlineShortArrays: z.boolean().default(false),
});

export type JsonFormatterOptions = z.infer<typeof jsonFormatterOptionsSchema>;

export const jsonFormatterInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
