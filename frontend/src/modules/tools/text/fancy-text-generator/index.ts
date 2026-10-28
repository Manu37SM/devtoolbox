import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const fancyTextGeneratorTool: ToolRegistryEntry = {
  slug: "fancy-text-generator",
  name: "Fancy Text Generator",
  module: "text",
  description: "Turn plain text into Unicode styles: bold, italic, script, fraktur, double-struck, monospace, circled, full-width, small caps, upside down, strikethrough and underline. Copy anywhere.",
  aliases: ["unicode text styles","bold text generator","cursive text","upside down text","instagram fonts"],
  icon: "Sparkles",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["unicode text styles","bold text generator","cursive text","upside down text","instagram fonts"] },
};
