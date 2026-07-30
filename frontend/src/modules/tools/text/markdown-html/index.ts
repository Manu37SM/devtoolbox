import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const markdownHtmlTool: ToolRegistryEntry = {
  slug: "markdown-html",
  name: "Markdown ↔ HTML",
  module: "text",
  description: "Convert Markdown to sanitized HTML with a live preview.",
  aliases: ["markdown to html", "markdown preview", "md to html converter"],
  icon: "FileText",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["markdown to html converter", "markdown preview online"] },
};
