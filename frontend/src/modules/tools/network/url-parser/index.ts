import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const urlParserTool: ToolRegistryEntry = {
  slug: "url-parser",
  name: "URL Parser",
  module: "network",
  description: "Break a URL down into protocol, host, port, path, query parameters, and hash.",
  aliases: ["url inspector", "url breakdown", "query string parser"],
  icon: "Link2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["url parser", "url inspector", "query string parser", "url breakdown"],
  },
};
