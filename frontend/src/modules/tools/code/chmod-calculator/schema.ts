import { z } from "zod";

export const chmodCalculatorOptionsSchema = z.object({
  current: z.string().max(10000).default("644"),
});
export type ChmodCalculatorOptions = z.infer<typeof chmodCalculatorOptionsSchema>;

export const chmodCalculatorInputSchema = z.string().max(1000000);
