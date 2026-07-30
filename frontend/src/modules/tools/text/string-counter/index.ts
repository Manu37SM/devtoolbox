import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const stringCounterTool: ToolRegistryEntry = {
  slug: "string-counter",
  name: "String/Word/Char Counter",
  module: "text",
  description: "Count characters, words, lines, sentences, and estimate reading time for any text.",
  aliases: ["word counter", "character counter", "text analyzer"],
  icon: "TextCursorInput",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["word counter", "character counter online", "text analyzer"] },
};
