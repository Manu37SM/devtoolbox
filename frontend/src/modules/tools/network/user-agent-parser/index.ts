import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const userAgentParserTool: ToolRegistryEntry = {
  slug: "user-agent-parser",
  name: "User-Agent Parser",
  module: "network",
  description: "Parse a User-Agent string into structured browser, OS, device, engine, and CPU details.",
  aliases: ["ua parser", "user agent string parser", "browser detector"],
  icon: "MonitorSmartphone",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["user agent parser online", "ua string parser", "browser detector"] },
};
