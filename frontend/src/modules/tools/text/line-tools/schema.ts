import { z } from "zod";

export const LINE_OPS = ["number", "prefix-suffix", "join", "split", "reverse-order", "trim", "remove-blank", "keep-matching", "remove-matching", "wrap", "indent", "dedent", "column"] as const;

export const lineToolsOptionsSchema = z.object({
  operation: z.enum(LINE_OPS).default("number"),
  param: z.string().default(""),
  param2: z.string().default(""),
  useRegex: z.boolean().default(false),
  ignoreCase: z.boolean().default(false),
  width: z.number().int().min(1).max(500).default(80),
});
export type LineToolsOptions = z.infer<typeof lineToolsOptionsSchema>;
