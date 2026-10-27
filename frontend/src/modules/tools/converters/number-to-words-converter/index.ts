import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const numberToWordsConverterTool: ToolRegistryEntry = {
  slug: "number-to-words-converter",
  name: "Number to Words Converter",
  module: "converters",
  description: "Spell out numbers in English (cardinal or ordinal) and parse spelled-out numbers back to digits.",
  aliases: ["number to words", "words to number", "spell out number", "number to text", "ordinal numbers"],
  icon: "SpellCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["number to words converter", "words to number", "spell out numbers", "ordinal number converter"] },
};
