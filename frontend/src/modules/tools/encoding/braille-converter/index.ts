import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const brailleConverterTool: ToolRegistryEntry = {
  slug: "braille-converter",
  name: "Braille Converter",
  module: "encoding",
  description: "Convert text to Unicode Braille and back (Grade 1 English): capital and number indicators, punctuation, Braille ASCII (BRF) mode, dot-pattern lookup and a per-cell dot breakdown.",
  aliases: ["braille", "brf", "braille ascii", "unicode braille", "braille translator", "text to braille", "braille to text", "dots"],
  icon: "Grip",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["braille converter", "braille", "brf", "braille ascii", "unicode braille", "braille translator", "text to braille", "braille to text", "dots"] },
};
