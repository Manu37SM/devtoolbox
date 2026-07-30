import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cssBeautifierTool: ToolRegistryEntry = {
  slug: "css-beautifier",
  name: "CSS Beautifier",
  module: "code",
  description: "Format CSS with Prettier, entirely in your browser.",
  aliases: ["css formatter", "css beautify", "css pretty print"],
  icon: "Paintbrush",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["css formatter online", "css beautifier", "css pretty print"] },
};
