import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const businessDaysCalculatorTool: ToolRegistryEntry = {
  slug: "business-days-calculator",
  name: "Business Days Calculator",
  module: "converters",
  description: "Add or subtract working days, count business days between two dates and list the days skipped, with custom weekends and a holiday list, for SLAs, settlement dates and delivery estimates.",
  aliases: ["working days", "workday", "networkdays", "t+2 settlement", "sla business days", "add working days"],
  icon: "CalendarClock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["business days calculator", "working days", "workday", "networkdays", "t+2 settlement", "sla business days", "add working days"] },
};
