import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const nlToCronTool: ToolRegistryEntry = {
  slug: "nl-to-cron",
  name: "Natural Language → Cron",
  module: "ai",
  description: "Describe a schedule in plain English and get a validated cron expression.",
  aliases: ["cron generator", "text to cron", "ai cron builder"],
  icon: "Clock",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["natural language to cron", "cron expression generator", "ai cron generator"] },
};

export { NlToCronToolView } from "./ToolView";
