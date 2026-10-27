import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const javaStacktraceAnalyzerTool: ToolRegistryEntry = {
  slug: "java-stacktrace-analyzer",
  name: "Java Stack Trace Analyzer",
  module: "text",
  description: "Find the root cause of a Java stack trace, show the exception chain, collapse framework frames to your packages, and get common-cause hints.",
  aliases: ["stack trace parser","java exception analyzer","caused by chain","stacktrace formatter"],
  icon: "Bug",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["stack trace parser","java exception analyzer","caused by chain","stacktrace formatter"] },
};
