import { z } from "zod";

export const mergeChoiceSchema = z.enum(["ours", "theirs", "both", "both-reverse", "base", "keep"]);
export type MergeChoice = z.infer<typeof mergeChoiceSchema>;

export const mergeConflictResolverOptionsSchema = z.object({
  /** What to do with every conflict that has no override. "keep" leaves the markers in place. */
  defaultChoice: mergeChoiceSchema.default("keep"),
  /** Per-conflict choices, "1=theirs, 3=both". Conflicts are numbered from 1. */
  overrides: z.string().max(5_000).default(""),
  /** Collapse conflicts whose two sides are the same, whatever the default says. */
  autoIdentical: z.boolean().default(true),
  /** Treat sides as identical when they differ only in whitespace. */
  ignoreWhitespace: z.boolean().default(false),
  output: z.enum(["resolved", "report"]).default("resolved"),
});
export type MergeConflictResolverOptions = z.infer<typeof mergeConflictResolverOptionsSchema>;

export const mergeConflictResolverInputSchema = z.string().max(5_000_000);
