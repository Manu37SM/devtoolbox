import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dateCalculatorTool: ToolRegistryEntry = {
  slug: "date-calculator",
  name: "Date Calculator",
  module: "converters",
  description: "Find the difference between two dates (days, weeks, y/m/d, business days) or add and subtract days, weeks, months, years or business days.",
  aliases: ["days between dates","date difference","add days to date","business days calculator"],
  icon: "CalendarDays",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["days between dates","date difference","add days to date","business days calculator"] },
};
