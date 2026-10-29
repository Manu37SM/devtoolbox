import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const icsEventGeneratorTool: ToolRegistryEntry = {
  slug: "ics-event-generator",
  name: "Calendar Event (.ics) Generator",
  module: "generators",
  description: "Create iCalendar (.ics) events that import into Google, Outlook and Apple Calendar: all-day or timed, timezone-aware, with reminders, recurrence and multiple events.",
  aliases: ["icalendar generator","add to calendar file","ics file creator","calendar invite","vevent"],
  icon: "CalendarPlus",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["icalendar generator","add to calendar file","ics file creator","calendar invite","vevent"] },
};
