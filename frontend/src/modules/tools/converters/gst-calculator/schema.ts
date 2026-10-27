import { z } from "zod";

export const gstCalculatorOptionsSchema = z.object({
  rate: z.enum(["0", "0.25", "3", "5", "12", "18", "28"]).default("18"),
  mode: z.enum(["exclusive", "inclusive"]).default("exclusive"),
  intraState: z.boolean().default(true),
});
export type GstCalculatorOptions = z.infer<typeof gstCalculatorOptionsSchema>;

export const gstCalculatorInputSchema = z.string().max(1000000);
