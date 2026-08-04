import { z } from "zod";

export const lineSortModeSchema = z.enum(["none", "alpha", "alpha-desc", "numeric", "length", "shuffle"]);
export type LineSortMode = z.infer<typeof lineSortModeSchema>;

export const lineDedupeModeSchema = z.enum(["none", "exact", "case-insensitive"]);
export type LineDedupeMode = z.infer<typeof lineDedupeModeSchema>;

export const lineSortDedupeOptionsSchema = z.object({
  sort: lineSortModeSchema.default("none"),
  dedupe: lineDedupeModeSchema.default("none"),
  trimEmptyLines: z.boolean().default(false),
  trimWhitespace: z.boolean().default(false),
});
export type LineSortDedupeOptions = z.infer<typeof lineSortDedupeOptionsSchema>;

export const lineSortDedupeInputSchema = z.string().max(50_000_000);
