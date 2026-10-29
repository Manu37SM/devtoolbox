import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const threadDumpAnalyzerTool: ToolRegistryEntry = {
  slug: "thread-dump-analyzer",
  name: "Java Thread Dump Analyzer",
  module: "code",
  description: "Analyze jstack, jcmd Thread.print or kill -3 output: thread states, deadlock cycles, contended locks with their owners, hot RUNNABLE frames and groups of threads with identical stacks.",
  aliases: ["jstack analyzer","java deadlock finder","thread dump viewer","fastthread alternative","blocked threads java"],
  icon: "Activity",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["jstack analyzer","java deadlock finder","thread dump viewer","fastthread alternative","blocked threads java"] },
};
