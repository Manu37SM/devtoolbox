import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const curlToCodeTool: ToolRegistryEntry = {
  slug: "curl-to-code",
  name: "cURL to Code",
  module: "code",
  description: "Convert a cURL command into fetch, axios or Python requests code. Runs entirely in your browser.",
  aliases: ["curl to fetch", "curl to axios", "curl to python", "curl converter"],
  icon: "TerminalSquare",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["curl to fetch", "curl to axios", "curl to python requests", "curl converter"] },
};
