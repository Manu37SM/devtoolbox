import { z } from "zod";

export const businessDaysCalculatorOptionsSchema = z.object({
  mode: z.enum(["add", "count", "list", "info"]).default("add"),
  /** add: number of business days (negative = go back) */
  days: z.number().int().min(-100000).max(100000).default(5),
  weekend: z.enum(["sat-sun", "fri-sat", "fri", "sat", "sun", "thu-fri", "none"]).default("sat-sun"),
  /** count: include the end date (Excel NETWORKDAYS) or stop before it (numpy busday_count) */
  inclusiveEnd: z.boolean().default(true),
  showSkipped: z.boolean().default(true),
});
export type BusinessDaysCalculatorOptions = z.infer<typeof businessDaysCalculatorOptionsSchema>;
