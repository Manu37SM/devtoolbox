import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const weekNumberCalculatorTool: ToolRegistryEntry = {
  slug: "week-number-calculator",
  name: "Week Number Calculator",
  module: "converters",
  description: "Find the ISO, US or custom week number, week range, day of year and quarter for any date, convert 2026-W44 back to dates, or list every week of a year with your own first weekday.",
  aliases: ["iso week number", "week of year", "what week is it", "weeknum", "week to date", "day of year", "iso 8601 week"],
  icon: "CalendarRange",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["week number calculator", "iso week number", "week of year", "what week is it", "weeknum", "week to date", "day of year", "iso 8601 week"] },
};
