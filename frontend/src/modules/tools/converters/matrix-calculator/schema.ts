import { z } from "zod";

export const matrixOperationSchema = z.enum([
  "determinant",
  "inverse",
  "transpose",
  "rank",
  "trace",
  "rref",
  "multiply",
  "add",
  "subtract",
  "power",
  "scalar",
  "solve",
  "charpoly",
]);
export type MatrixOperation = z.infer<typeof matrixOperationSchema>;

export const matrixCalculatorOptionsSchema = z.object({
  operation: matrixOperationSchema.default("determinant"),
  /** Exponent for "power" (negative uses the inverse). */
  exponent: z.number().int().min(-20).max(64).default(2),
  /** Multiplier for "scalar": an integer, decimal or fraction such as 2/3. */
  scalar: z.string().max(40).default("2"),
  display: z.enum(["fraction", "decimal", "both"]).default("fraction"),
  /** Decimal places when showing decimals. */
  decimals: z.number().int().min(0).max(30).default(6),
});
export type MatrixCalculatorOptions = z.infer<typeof matrixCalculatorOptionsSchema>;

export const matrixCalculatorInputSchema = z.string().max(50_000);
