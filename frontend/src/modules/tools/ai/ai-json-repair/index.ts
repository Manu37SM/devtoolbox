import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const aiJsonRepairTool: ToolRegistryEntry = {
  slug: "ai-json-repair",
  name: "AI JSON Repair",
  module: "ai",
  description: "Fix malformed JSON — trailing commas and unquoted keys are fixed instantly; AI handles the rest.",
  aliases: ["fix json", "json fixer", "malformed json repair"],
  icon: "Wrench",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["fix malformed json", "json repair tool", "ai json fixer"] },
};

export { AiJsonRepairToolView } from "./ToolView";
