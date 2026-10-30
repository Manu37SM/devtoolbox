import { z } from "zod";

export const percentageCalculatorOptionsSchema = z.object({
  /** Maximum decimal places in results (trailing zeros are dropped). */
  decimals: z.number().int().min(0).max(10).default(6),
  /** "line" repeats the question ("20% of 150  =  30"); "result" prints only the answer. */
  output: z.enum(["line", "result"]).default("line"),
  /** Group thousands in results: 1,234,567.5. */
  grouping: z.boolean().default(false),
});
export type PercentageCalculatorOptions = z.infer<typeof percentageCalculatorOptionsSchema>;

export const percentageCalculatorInputSchema = z.string().max(1000000);
