import { z } from "zod";

export const textWrapFormatterOptionsSchema = z.object({
  mode: z.enum(["wrap", "unwrap"]).default("wrap"),
  /** Maximum line length, prefix included. */
  width: z.number().int().min(10).max(500).default(80),
  align: z.enum(["left", "right", "center", "justify"]).default("left"),
  /** Spaces before the first line of each paragraph. */
  firstIndent: z.number().int().min(0).max(40).default(0),
  /** Spaces before every following line (hanging indent). */
  hangingIndent: z.number().int().min(0).max(40).default(0),
  /** Text put in front of every line, e.g. "// " or "> ". Overrides a detected prefix. */
  prefix: z.string().max(20).default(""),
  /** Strip a shared comment/quote prefix (//, #, *, >, --) before wrapping and put it back after. */
  detectPrefix: z.boolean().default(true),
  /** Join the lines of a paragraph first (reflow). Off wraps each existing line on its own. */
  joinLines: z.boolean().default(true),
  /** Break words longer than the line (URLs are left whole when off). */
  breakLongWords: z.boolean().default(false),
});
export type TextWrapFormatterOptions = z.infer<typeof textWrapFormatterOptionsSchema>;

export const textWrapFormatterInputSchema = z.string().max(2_000_000);
