import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const logrotateConfigGeneratorTool: ToolRegistryEntry = {
  slug: "logrotate-config-generator",
  name: "logrotate Config Generator",
  module: "generators",
  description: "Generate a logrotate rule with rotation schedule, size limits, retention, compression, create mode and owner, copytruncate, date extensions, and pre or post rotate scripts.",
  aliases: ["logrotate.d", "rotate logs", "logrotate conf", "log rotation config", "copytruncate", "logrotate daily compress"],
  icon: "FileClock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["logrotate config generator", "logrotate.d", "rotate logs", "logrotate conf", "log rotation config", "copytruncate", "logrotate daily compress"] },
};
