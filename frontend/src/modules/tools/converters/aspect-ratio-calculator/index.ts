import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const aspectRatioCalculatorTool: ToolRegistryEntry = {
  slug: "aspect-ratio-calculator",
  name: "Aspect Ratio Calculator",
  module: "converters",
  description: "Simplify width×height to an aspect ratio, find the nearest common ratio, and scale dimensions to a target width or height.",
  aliases: ["aspect ratio","resolution to ratio","16:9 calculator","scale dimensions"],
  icon: "RectangleHorizontal",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["aspect ratio","resolution to ratio","16:9 calculator","scale dimensions"] },
};
