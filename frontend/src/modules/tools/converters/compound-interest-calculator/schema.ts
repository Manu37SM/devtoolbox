import { z } from "zod";

export const compoundInterestCalculatorOptionsSchema = z.object({
  principal: z.number().min(0).default(100000),
  monthly: z.number().min(0).default(5000),
  rate: z.number().min(0).max(100).default(12),
  years: z.number().min(0).max(100).default(10),
  compounding: z.enum(["1", "2", "4", "12", "365"]).default("12"),
  yearly: z.boolean().default(true),
});
export type CompoundInterestCalculatorOptions = z.infer<typeof compoundInterestCalculatorOptionsSchema>;

export const compoundInterestCalculatorInputSchema = z.string().max(1000000);
