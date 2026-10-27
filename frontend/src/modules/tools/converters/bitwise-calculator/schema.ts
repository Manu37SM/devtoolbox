import { z } from "zod";

export const bitwiseCalculatorOptionsSchema = z.object({
  width: z.enum(["8", "16", "32", "64"]).default("32"),
});
export type BitwiseCalculatorOptions = z.infer<typeof bitwiseCalculatorOptionsSchema>;

export const bitwiseCalculatorInputSchema = z.string().max(1000000);
