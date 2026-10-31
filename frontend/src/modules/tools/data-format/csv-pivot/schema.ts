import { z } from "zod";

export const csvPivotOptionsSchema = z.object({
  delimiter: z.enum(["auto", ",", "\t", ";", "|"]).default("auto"),
  hasHeader: z.boolean().default(true),
  /** Columns to group by (names or 1-based numbers), comma separated. Empty = one group for all rows */
  groupBy: z.string().max(500).default(""),
  /** e.g. "count(), sum(amount), avg(price) as mean_price" */
  aggregates: z.string().max(1000).default("count()"),
  /** Optional: spread the values of this column across new columns (uses the first aggregate) */
  pivotColumn: z.string().max(200).default(""),
  /** Cell value for combinations that do not occur when pivoting */
  fill: z.string().max(50).default(""),
  sortBy: z.enum(["none", "group", "group-desc", "first-aggregate", "first-aggregate-desc"]).default("group"),
  /** Add a grand-total row (and column when pivoting); only for count, sum, min and max */
  totals: z.boolean().default(false),
  /** Remove thousands separators such as 1,234.50 before reading numbers */
  stripThousands: z.boolean().default(true),
  /** Ignore cells that are not numbers instead of failing (sum, avg, min, max, median, stdev) */
  skipNonNumeric: z.boolean().default(true),
  caseInsensitive: z.boolean().default(false),
  trim: z.boolean().default(true),
  decimals: z.number().int().min(0).max(10).default(4),
  output: z.enum(["csv", "tsv", "json", "markdown"]).default("csv"),
});
export type CsvPivotOptions = z.infer<typeof csvPivotOptionsSchema>;
