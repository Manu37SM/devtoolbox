import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cronToSystemdTimerTool: ToolRegistryEntry = {
  slug: "cron-to-systemd-timer",
  name: "Cron to systemd Timer",
  module: "code",
  description: "Convert a cron expression into a systemd OnCalendar timer with a ready .timer and .service unit pair, including @shortcuts, step and range fields, randomized delay and persistence.",
  aliases: ["crontab to systemd", "oncalendar", "systemd timer generator", "cron to oncalendar", "replace cron with systemd"],
  icon: "Timer",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["cron to systemd timer", "crontab to systemd", "oncalendar", "systemd timer generator", "cron to oncalendar", "replace cron with systemd"] },
};
