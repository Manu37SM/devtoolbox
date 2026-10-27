import { z } from "zod";

export const dateCalculatorOptionsSchema = z.object({
  inclusive: z.boolean().default(false),
});
export type DateCalculatorOptions = z.infer<typeof dateCalculatorOptionsSchema>;

export const dateCalculatorInputSchema = z.string().max(1000000);
