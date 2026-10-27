import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const morseCodeConverterTool: ToolRegistryEntry = {
  slug: "morse-code-converter",
  name: "Morse Code Converter",
  module: "converters",
  description: "Translate text to International Morse code and back, with word and letter separators.",
  aliases: ["text to morse", "morse to text", "morse translator"],
  icon: "Radio",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["morse code converter", "text to morse code", "morse code translator"] },
};
