import { z } from "zod";

export const statisticsCalculatorOptionsSchema = z.object({
  decimals: z.number().int().min(0).max(10).default(4),
  percentile: z.number().min(0).max(100).default(90),
});
export type StatisticsCalculatorOptions = z.infer<typeof statisticsCalculatorOptionsSchema>;

export const statisticsCalculatorInputSchema = z.string().max(2_000_000);
