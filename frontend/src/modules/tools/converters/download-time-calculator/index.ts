import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const downloadTimeCalculatorTool: ToolRegistryEntry = {
  slug: "download-time-calculator",
  name: "Download Time Calculator",
  module: "converters",
  description: "Estimate transfer time for a file size over a given connection speed, with real-world link efficiency. Handles MB vs MiB and Mbps vs MBps.",
  aliases: ["file transfer time","bandwidth calculator","upload time","mbps to mb/s"],
  icon: "Download",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["file transfer time","bandwidth calculator","upload time","mbps to mb/s"] },
};
