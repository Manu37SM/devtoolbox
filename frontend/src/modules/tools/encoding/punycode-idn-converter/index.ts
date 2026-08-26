import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const punycodeIdnConverterTool: ToolRegistryEntry = {
  slug: "punycode-idn-converter",
  name: "Punycode/IDN Encode-Decode",
  module: "encoding",
  description: "Convert internationalized domain names to/from their ASCII-compatible Punycode form.",
  aliases: ["punycode converter", "idn encoder", "unicode domain to ascii"],
  icon: "Globe",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["punycode converter", "idn encode decode", "unicode domain converter"] },
};
