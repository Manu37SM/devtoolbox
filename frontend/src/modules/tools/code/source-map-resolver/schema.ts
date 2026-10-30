import { z } from "zod";

export const sourceMapResolverOptionsSchema = z.object({
  /** Whether the columns you enter (and the stack trace's) start at 0 or 1. Browsers print 1-based. */
  columnBase: z.enum(["1", "0"]).default("1"),
  /** Segment to use when the position falls between mappings. */
  bias: z.enum(["before", "after"]).default("before"),
  /** Lines of original source to print around each result (needs sourcesContent). */
  context: z.number().int().min(0).max(10).default(2),
  mode: z.enum(["lookup", "sources", "mappings"]).default("lookup"),
  /** Print the original file path relative to this prefix removed (e.g. "webpack://app/"). */
  stripPrefix: z.string().max(200).default(""),
});
export type SourceMapResolverOptions = z.infer<typeof sourceMapResolverOptionsSchema>;

export const sourceMapResolverInputSchema = z.string().max(20_000_000);
