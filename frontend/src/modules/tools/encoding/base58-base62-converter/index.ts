import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const base58Base62ConverterTool: ToolRegistryEntry = {
  slug: "base58-base62-converter",
  name: "Base58 / Base62 Converter",
  module: "encoding",
  description: "Encode and decode Base58 (Bitcoin, Flickr, Ripple alphabets) and Base62 for text or hex bytes, with correct leading-zero handling.",
  aliases: ["base58","base62","bitcoin base58","short id encoding","base58check alphabet"],
  icon: "Binary",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["base58","base62","bitcoin base58","short id encoding","base58check alphabet"] },
};
