import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const statisticsCalculatorTool: ToolRegistryEntry = {
  slug: "statistics-calculator",
  name: "Statistics Calculator",
  module: "converters",
  description: "Paste a list of numbers for mean, median, mode, variance and standard deviation (sample and population), quartiles, IQR, any percentile, skewness, geometric/harmonic means and outliers.",
  aliases: ["mean median mode","standard deviation calculator","percentile calculator","descriptive statistics","quartiles iqr outliers"],
  icon: "ChartColumn",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["mean median mode","standard deviation calculator","percentile calculator","descriptive statistics","quartiles iqr outliers"] },
};
