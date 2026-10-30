import { z } from "zod";

export const csvDiffOptionsSchema = z.object({
  delimiter: z.enum(["auto", ",", "\t", ";", "|"]).default("auto"),
  hasHeader: z.boolean().default(true),
  /** Columns that identify a row, by name or 1-based number: "id" or "region, sku". Empty compares whole rows. */
  keyColumns: z.string().max(500).default(""),
  /** Columns left out of the comparison. */
  ignoreColumns: z.string().max(500).default(""),
  ignoreCase: z.boolean().default(false),
  trimWhitespace: z.boolean().default(true),
  /** Numbers closer than this are equal (0 = exact). */
  numericTolerance: z.number().min(0).default(0),
  output: z.enum(["summary", "csv", "json"]).default("summary"),
  /** CSV output only: also write rows that did not change. */
  includeUnchanged: z.boolean().default(false),
});
export type CsvDiffOptions = z.infer<typeof csvDiffOptionsSchema>;

export const csvDiffInputSchema = z.string().max(5_000_000);
