import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const unicodeNormalizerTool: ToolRegistryEntry = {
  slug: "unicode-normalizer",
  name: "Unicode Normalizer & Text Cleaner",
  module: "text",
  description: "Normalize text to NFC, NFD, NFKC or NFKD, strip accents, remove zero-width and bidi characters, straighten smart quotes and dashes, and collapse exotic spaces.",
  aliases: ["nfc nfd converter","remove zero width characters","strip accents","smart quotes to straight","unicode normalization form"],
  icon: "Languages",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["nfc nfd converter","remove zero width characters","strip accents","smart quotes to straight","unicode normalization form"] },
};
