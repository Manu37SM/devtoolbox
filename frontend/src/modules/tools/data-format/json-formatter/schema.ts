import { z } from "zod";

/**
 * Options schema for the JSON Formatter tool.
 * The OptionsPanel UI (see UI_GUIDELINES.md §4) is generated from this
 * schema — do not hand-build a separate options form.
 */
export const jsonFormatterOptionsSchema = z.object({
  indent: z.union([z.literal(2), z.literal(4), z.literal("tab")]).default(2),
  sortKeys: z.boolean().default(false),
  mode: z.enum(["beautify", "minify"]).default("beautify"),
});

export type JsonFormatterOptions = z.infer<typeof jsonFormatterOptionsSchema>;

export const jsonFormatterInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
