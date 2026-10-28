import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const epochFormatConverterTool: ToolRegistryEntry = {
  slug: "epoch-format-converter",
  name: "Epoch Format Converter",
  module: "converters",
  description: "Convert one timestamp between Unix seconds, milliseconds, microseconds and nanoseconds, Windows FILETIME, .NET ticks, Excel serial dates, Apple Cocoa, WebKit/Chrome, GPS time, Julian Day and ISO 8601.",
  aliases: ["filetime converter","dotnet ticks to date","excel serial to date","webkit timestamp","cocoa timestamp","julian day number"],
  icon: "Clock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["filetime converter","dotnet ticks to date","excel serial to date","webkit timestamp","cocoa timestamp","julian day number"] },
};
