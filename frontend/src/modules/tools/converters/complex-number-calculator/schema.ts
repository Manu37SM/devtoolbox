import { z } from "zod";

export const complexNumberCalculatorOptionsSchema = z.object({
  mode: z.enum(["evaluate", "nthroots", "polynomial"]).default("evaluate"),
  form: z.enum(["all", "rectangular", "polar", "exponential"]).default("all"),
  angleUnit: z.enum(["deg", "rad"]).default("deg"),
  /** significant digits */
  precision: z.number().int().min(1).max(15).default(8),
  /** n for the nthroots mode */
  n: z.number().int().min(1).max(360).default(3),
  /** write i or j in the output */
  unit: z.enum(["i", "j"]).default("i"),
});
export type ComplexNumberCalculatorOptions = z.infer<typeof complexNumberCalculatorOptionsSchema>;
