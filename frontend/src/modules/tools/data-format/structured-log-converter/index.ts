import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const structuredLogConverterTool: ToolRegistryEntry = {
  slug: "structured-log-converter",
  name: "Structured Log Converter (logfmt / JSON)",
  module: "data-format",
  description: "Convert logfmt and JSON log lines (pino, bunyan, Zap, ECS, Logback JSON) to a readable view, JSON lines or logfmt, with level filtering and nested fields flattened.",
  aliases: ["logfmt to json","json logs pretty print","pino pretty online","ndjson log viewer","ecs log reader"],
  icon: "ScrollText",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["logfmt to json","json logs pretty print","pino pretty online","ndjson log viewer","ecs log reader"] },
};
