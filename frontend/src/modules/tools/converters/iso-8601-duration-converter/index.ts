import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const iso8601DurationConverterTool: ToolRegistryEntry = {
  slug: "iso-8601-duration-converter",
  name: "ISO 8601 Duration Converter",
  module: "converters",
  description: "Convert ISO 8601 durations (P3DT4H30M) to readable text or seconds, and seconds back to ISO 8601.",
  aliases: ["iso duration", "period converter", "duration parser", "P1DT2H", "seconds to iso duration"],
  icon: "Timer",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["iso 8601 duration converter", "iso duration to seconds", "seconds to iso 8601 duration", "parse PT1H30M"] },
};
