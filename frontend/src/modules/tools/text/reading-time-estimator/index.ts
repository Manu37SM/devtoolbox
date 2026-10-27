import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const readingTimeEstimatorTool: ToolRegistryEntry = {
  slug: "reading-time-estimator",
  name: "Reading Time Estimator",
  module: "text",
  description: "Word, sentence and paragraph counts with estimated reading and speaking time. Understands Markdown and CJK text.",
  aliases: ["reading time","word count","speaking time","blog read time"],
  icon: "Clock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["reading time","word count","speaking time","blog read time"] },
};
