import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const httpHeaderAnalyzerTool: ToolRegistryEntry = {
  slug: "http-header-analyzer",
  name: "HTTP Header Analyzer",
  module: "network",
  description: "Parse pasted response headers and review security headers: HSTS, CSP, framing, CORS, cookie flags and version disclosure.",
  aliases: ["security headers checker","http headers parser","hsts csp check","cors header check"],
  icon: "ShieldAlert",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["security headers checker","http headers parser","hsts csp check","cors header check"] },
};
