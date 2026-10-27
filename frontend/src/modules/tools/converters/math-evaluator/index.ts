import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const mathEvaluatorTool: ToolRegistryEntry = {
  slug: "math-evaluator",
  name: "Math Expression Evaluator",
  module: "converters",
  description: "Evaluate math expressions line by line with variables, functions and constants. Uses a safe parser — no eval.",
  aliases: ["calculator","expression evaluator","scientific calculator","formula calculator"],
  icon: "Calculator",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["calculator","expression evaluator","scientific calculator","formula calculator"] },
};
