import { z } from "zod";

export const percentageCalculatorOptionsSchema = z.object({

});
export type PercentageCalculatorOptions = z.infer<typeof percentageCalculatorOptionsSchema>;

export const percentageCalculatorInputSchema = z.string().max(1000000);
