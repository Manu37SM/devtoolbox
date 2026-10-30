import { z } from "zod";

export const distributionSchema = z.enum(["binomial", "poisson", "geometric", "hypergeometric", "normal", "exponential", "uniform", "combinatorics"]);
export type Distribution = z.infer<typeof distributionSchema>;

export const probabilityCalculatorOptionsSchema = z.object({
  distribution: distributionSchema.default("binomial"),
  /**
   * What to compute. "eq" is P(X = x) (the density for continuous distributions),
   * "le"/"lt"/"ge"/"gt" are tail probabilities, "between" is P(x ≤ X ≤ x2),
   * "quantile" finds the x whose cumulative probability is `x`.
   */
  query: z.enum(["eq", "le", "lt", "ge", "gt", "between", "quantile"]).default("le"),
  /** The value x (or the probability for "quantile"). */
  x: z.number().default(3),
  /** Upper bound for "between". */
  x2: z.number().default(6),
  significantDigits: z.number().int().min(3).max(15).default(8),
});
export type ProbabilityCalculatorOptions = z.infer<typeof probabilityCalculatorOptionsSchema>;

export const probabilityCalculatorInputSchema = z.string().max(500);
