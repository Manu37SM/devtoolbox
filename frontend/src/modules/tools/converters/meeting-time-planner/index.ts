import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const meetingTimePlannerTool: ToolRegistryEntry = {
  slug: "meeting-time-planner",
  name: "Meeting Time Planner",
  module: "converters",
  description: "Find meeting times that fit everyone's working hours across time zones and DST: overlap windows, best compromises, a 24-hour grid, per-person hours, weekends and 12 or 24 hour display.",
  aliases: ["meeting planner", "world clock meeting", "overlap time zones", "find meeting time", "time zone overlap", "schedule across timezones", "team time zones", "working hours overlap"],
  icon: "Users",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["meeting time planner", "meeting planner", "world clock meeting", "overlap time zones", "find meeting time", "time zone overlap", "schedule across timezones", "team time zones", "working hours overlap"] },
};
