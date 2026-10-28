import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const durationConverterTool: ToolRegistryEntry = {
  slug: "duration-converter",
  name: "Duration Converter",
  module: "converters",
  description: "Convert durations between human text (1h 30m, 2 days 3 hours), clock format (01:30:45), ISO 8601 (PT1H30M) and totals in ms, seconds, minutes, hours and days.",
  aliases: ["seconds to hours","ms to human readable","hh:mm:ss converter","time span calculator","timeout converter"],
  icon: "Timer",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["seconds to hours","ms to human readable","hh:mm:ss converter","time span calculator","timeout converter"] },
};
