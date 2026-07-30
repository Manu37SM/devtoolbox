import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cronBuilderTool: ToolRegistryEntry = {
  slug: "cron-builder",
  name: "Cron Expression Builder/Parser",
  module: "code",
  description: "Build, validate, and preview cron expressions with a plain-language description and next-run times.",
  aliases: ["cron generator", "crontab parser", "cron expression tester"],
  icon: "Timer",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["cron expression builder", "crontab generator", "cron parser online"] },
};
