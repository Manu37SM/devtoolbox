import { z } from "zod";

export const csvJoinOptionsSchema = z.object({
  delimiter: z.enum(["auto", ",", "\t", ";", "|"]).default("auto"),
  hasHeader: z.boolean().default(true),
  /** Key column(s) in the left file, by name or 1-based number: "id" or "region, sku". */
  leftKey: z.string().max(500).default(""),
  /** Key column(s) in the right file. Empty = same as the left key. */
  rightKey: z.string().max(500).default(""),
  joinType: z.enum(["inner", "left", "right", "full", "left-anti", "right-anti"]).default("left"),
  ignoreCase: z.boolean().default(false),
  trimKeys: z.boolean().default(true),
  /** Appended to right-file columns whose name already exists on the left. */
  suffix: z.string().max(30).default("_right"),
  /** Leave out the right file's key columns (they repeat the left ones). */
  dropRightKeys: z.boolean().default(true),
  /** Output columns to keep, in order; empty keeps everything. */
  columns: z.string().max(1_000).default(""),
  output: z.enum(["csv", "json", "markdown", "stats"]).default("csv"),
});
export type CsvJoinOptions = z.infer<typeof csvJoinOptionsSchema>;

export const csvJoinInputSchema = z.string().max(5_000_000);
