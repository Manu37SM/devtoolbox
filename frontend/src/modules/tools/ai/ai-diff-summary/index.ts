import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const aiDiffSummaryTool: ToolRegistryEntry = {
  slug: "ai-diff-summary",
  name: "AI Diff Summary",
  module: "ai",
  description: "Get a plain-language summary of what changed between two versions of text or JSON.",
  aliases: ["diff summarizer", "ai changelog", "explain diff"],
  icon: "FileDiff",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["summarize diff", "ai diff explanation", "explain json changes"] },
};

export { AiDiffSummaryToolView } from "./ToolView";
