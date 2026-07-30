import { z } from "zod";

export const textDiffOptionsSchema = z.object({
  mode: z.enum(["line", "word", "char"]).default("line"),
  ignoreWhitespace: z.boolean().default(false),
  ignoreCase: z.boolean().default(false),
});
export type TextDiffOptions = z.infer<typeof textDiffOptionsSchema>;
