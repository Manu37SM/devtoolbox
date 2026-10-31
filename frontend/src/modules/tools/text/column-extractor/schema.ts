import { z } from "zod";

export const columnExtractorOptionsSchema = z.object({
  /** What separates columns in the input */
  split: z.enum(["whitespace", "space", "tab", "comma", "semicolon", "pipe", "colon", "regex", "custom", "chars"]).default("whitespace"),
  /** Used by split = custom (literal text) and regex (pattern) */
  delimiterText: z.string().max(200).default(""),
  /** Columns: 1,3  2-4  5-  -3 (first three)  ~1 (last)  ~2-~1 (last two) */
  columns: z.string().max(500).default("1"),
  mode: z.enum(["keep", "drop"]).default("keep"),
  outputSeparator: z.enum(["same", "space", "tab", "comma", "semicolon", "pipe", "custom"]).default("same"),
  outputCustom: z.string().max(50).default(""),
  /** Treat "quoted, fields" as one column (comma/semicolon/tab/pipe/custom splits) */
  respectQuotes: z.boolean().default(false),
  trim: z.boolean().default(true),
  skipEmptyLines: z.boolean().default(true),
  /** Lines to skip at the top (e.g. a header) */
  skipLines: z.number().int().min(0).max(1000).default(0),
  /** What to do when a line does not have a requested column */
  missing: z.enum(["empty", "omit", "skip-line"]).default("empty"),
  /** Drop repeated output lines */
  deduplicate: z.boolean().default(false),
});
export type ColumnExtractorOptions = z.infer<typeof columnExtractorOptionsSchema>;
