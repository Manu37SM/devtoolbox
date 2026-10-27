import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const natoAlphabetConverterTool: ToolRegistryEntry = {
  slug: "nato-alphabet-converter",
  name: "NATO Phonetic Alphabet",
  module: "converters",
  description: "Spell text with the NATO phonetic alphabet (Alfa, Bravo, Charlie…) and decode it back.",
  aliases: ["phonetic alphabet","text to nato","spelling alphabet","icao alphabet"],
  icon: "RadioTower",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["phonetic alphabet","text to nato","spelling alphabet","icao alphabet"] },
};
