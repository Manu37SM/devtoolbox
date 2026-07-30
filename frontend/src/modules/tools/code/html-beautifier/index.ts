import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const htmlBeautifierTool: ToolRegistryEntry = {
  slug: "html-beautifier",
  name: "HTML Beautifier",
  module: "code",
  description: "Format HTML with Prettier, including embedded CSS/JS, entirely in your browser.",
  aliases: ["html formatter", "html beautify", "html pretty print"],
  icon: "Code",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["html formatter online", "html beautifier", "html pretty print"] },
};
