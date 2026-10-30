import { z } from "zod";

export const lineSortModeSchema = z.enum([
  "none",
  "alpha",
  "alpha-desc",
  "natural",
  "natural-desc",
  "numeric",
  "numeric-desc",
  "length",
  "length-desc",
  "reverse",
  "shuffle",
]);
export type LineSortMode = z.infer<typeof lineSortModeSchema>;

/**
 * exact / case-insensitive keep the first occurrence; "unique" keeps only lines that occur once
 * (uniq -u); "duplicates" keeps one copy of each line that repeats (uniq -d).
 */
export const lineDedupeModeSchema = z.enum(["none", "exact", "case-insensitive", "unique", "duplicates"]);
export type LineDedupeMode = z.infer<typeof lineDedupeModeSchema>;

export const lineSortDedupeOptionsSchema = z.object({
  sort: lineSortModeSchema.default("none"),
  dedupe: lineDedupeModeSchema.default("none"),
  trimEmptyLines: z.boolean().default(false),
  trimWhitespace: z.boolean().default(false),
  /** Sort upper-case before lower-case in code-point order (like `LC_ALL=C sort`) instead of by locale. */
  caseSensitive: z.boolean().default(false),
  /** Sort by a field instead of the whole line: 0 = whole line, 1 = first field... */
  column: z.number().int().min(0).max(1000).default(0),
  /** Field separator for column sorting. */
  columnDelimiter: z.enum(["whitespace", ",", "\t", ";", "|", ":"]).default("whitespace"),
  /** Prefix each output line with how many times it occurred (uniq -c). */
  countOccurrences: z.boolean().default(false),
});
export type LineSortDedupeOptions = z.infer<typeof lineSortDedupeOptionsSchema>;

export const lineSortDedupeInputSchema = z.string().max(50_000_000);
