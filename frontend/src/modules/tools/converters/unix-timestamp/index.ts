import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const unixTimestampTool: ToolRegistryEntry = {
  slug: "unix-timestamp",
  name: "Unix Timestamp Converter",
  module: "converters",
  description: "Convert Unix timestamps to human-readable dates and back, with a live clock.",
  aliases: ["epoch converter", "timestamp to date", "unix time converter"],
  icon: "Clock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["unix timestamp converter", "epoch converter", "timestamp to date online"] },
};
