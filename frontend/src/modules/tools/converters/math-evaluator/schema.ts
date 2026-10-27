import { z } from "zod";

export const mathEvaluatorOptionsSchema = z.object({
  angle: z.enum(["rad", "deg"]).default("rad"),
  precision: z.number().int().min(1).max(21).default(12),
  allowCommas: z.boolean().default(true),
});
export type MathEvaluatorOptions = z.infer<typeof mathEvaluatorOptionsSchema>;

export const mathEvaluatorInputSchema = z.string().max(1000000);
