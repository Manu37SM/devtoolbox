import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const timezoneConverterTool: ToolRegistryEntry = {
  slug: "timezone-converter",
  name: "Timezone Converter",
  module: "converters",
  description: "Convert a date and time between IANA timezones and view it in several zones at once.",
  aliases: ["time zone converter", "convert timezone", "world clock"],
  icon: "Clock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["timezone converter", "convert time between timezones", "world clock online"] },
};
