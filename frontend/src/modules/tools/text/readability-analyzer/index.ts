import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const readabilityAnalyzerTool: ToolRegistryEntry = {
  slug: "readability-analyzer",
  name: "Readability Score Analyzer",
  module: "text",
  description: "Score any text with Flesch Reading Ease, Flesch-Kincaid grade, Gunning Fog, SMOG, Coleman-Liau and ARI, plus word, sentence and syllable counts and estimated reading time.",
  aliases: ["flesch reading ease","flesch kincaid grade level","gunning fog index","readability checker","reading level calculator"],
  icon: "BookOpenText",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["flesch reading ease","flesch kincaid grade level","gunning fog index","readability checker","reading level calculator"] },
};
