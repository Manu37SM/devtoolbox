import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const markdownTocGeneratorTool: ToolRegistryEntry = {
  slug: "markdown-toc-generator",
  name: "Markdown Table of Contents Generator",
  module: "text",
  description: "Generate a nested table of contents from Markdown headings with GitHub-compatible anchors, duplicate handling and level limits. Ignores headings inside code fences.",
  aliases: ["readme table of contents","markdown toc","github anchor links","heading index"],
  icon: "ListTree",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["readme table of contents","markdown toc","github anchor links","heading index"] },
};
