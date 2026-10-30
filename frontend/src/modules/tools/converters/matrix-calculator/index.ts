import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const matrixCalculatorTool: ToolRegistryEntry = {
  slug: "matrix-calculator",
  name: "Matrix Calculator",
  module: "converters",
  description: "Exact matrix algebra with fractions: determinant, inverse, rank, RREF, transpose, trace, product, power, linear system solver and characteristic polynomial, shown as fractions or decimals.",
  aliases: ["matrix determinant", "matrix inverse", "gaussian elimination", "rref", "linear equations solver", "matrix multiplication", "characteristic polynomial"],
  icon: "Grid3x3",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["matrix calculator", "matrix determinant", "matrix inverse", "gaussian elimination", "rref", "linear equations solver", "matrix multiplication", "characteristic polynomial"] },
};
