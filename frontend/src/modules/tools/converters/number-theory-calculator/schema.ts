import { z } from "zod";

export const numberTheoryCalculatorOptionsSchema = z.object({
  operation: z.enum(["analyze", "gcd-lcm", "fibonacci", "factorial", "primes-up-to"]).default("analyze"),
});
export type NumberTheoryCalculatorOptions = z.infer<typeof numberTheoryCalculatorOptionsSchema>;

export const numberTheoryCalculatorInputSchema = z.string().max(10_000);
