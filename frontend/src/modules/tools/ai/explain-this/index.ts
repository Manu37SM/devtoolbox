import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const explainThisTool: ToolRegistryEntry = {
  slug: "explain-this",
  name: "Explain This",
  module: "ai",
  description: "Get a plain-language explanation of a regex, cron expression, JSON Schema, or SQL query.",
  aliases: ["regex explainer", "cron explainer", "sql explainer", "ai explain"],
  icon: "Sparkles",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["explain regex online", "explain cron expression", "sql query explainer", "ai code explainer"] },
};

export { ExplainThisToolView } from "./ToolView";
