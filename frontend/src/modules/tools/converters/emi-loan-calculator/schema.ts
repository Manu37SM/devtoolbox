import { z } from "zod";

export const emiLoanCalculatorOptionsSchema = z.object({
  principal: z.number().min(0).default(1000000),
  rate: z.number().min(0).max(100).default(8.5),
  tenure: z.number().min(0).default(20),
  tenureUnit: z.enum(["years", "months"]).default("years"),
  schedule: z.boolean().default(false),
});
export type EmiLoanCalculatorOptions = z.infer<typeof emiLoanCalculatorOptionsSchema>;

export const emiLoanCalculatorInputSchema = z.string().max(1000000);
