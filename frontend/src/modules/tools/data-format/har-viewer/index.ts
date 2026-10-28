import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const harViewerTool: ToolRegistryEntry = {
  slug: "har-viewer",
  name: "HAR File Viewer",
  module: "data-format",
  description: "Summarize a HAR export from browser DevTools: request counts, failures, transfer size by content type, and the slowest or largest requests. Runs locally, so cookies and tokens stay private.",
  aliases: ["har analyzer","http archive viewer","devtools network export","slow requests har","har file parser"],
  icon: "Activity",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["har analyzer","http archive viewer","devtools network export","slow requests har","har file parser"] },
};
