import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const probabilityCalculatorTool: ToolRegistryEntry = {
  slug: "probability-calculator",
  name: "Probability Distribution Calculator",
  module: "converters",
  description: "Probabilities, quantiles, mean and variance for binomial, Poisson, geometric, hypergeometric, normal, exponential and uniform distributions, plus combinations and permutations.",
  aliases: ["binomial probability", "normal distribution calculator", "z-score", "poisson probability", "nCr nPr", "probability distribution", "quantile"],
  icon: "Sigma",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["probability distribution calculator", "binomial probability", "normal distribution calculator", "z-score", "poisson probability", "nCr nPr", "probability distribution", "quantile"] },
};
