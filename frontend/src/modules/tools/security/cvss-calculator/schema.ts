import { z } from "zod";

export const cvssCalculatorOptionsSchema = z.object({
  showBreakdown: z.boolean().default(true),
});
export type CvssCalculatorOptions = z.infer<typeof cvssCalculatorOptionsSchema>;

export const cvssCalculatorInputSchema = z.string().max(50_000);
