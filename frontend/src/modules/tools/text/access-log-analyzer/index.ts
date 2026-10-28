import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const accessLogAnalyzerTool: ToolRegistryEntry = {
  slug: "access-log-analyzer",
  name: "Access Log Analyzer (nginx / Apache)",
  module: "text",
  description: "Summarize nginx and Apache access logs in Common or Combined format: status classes, top paths, IPs, failing requests, bandwidth, user agents, referrers and requests per hour.",
  aliases: ["nginx log analyzer","apache log parser","combined log format","top ips access log","http error rate"],
  icon: "ScrollText",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["nginx log analyzer","apache log parser","combined log format","top ips access log","http error rate"] },
};
