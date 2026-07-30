import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const yamlFormatterTool: ToolRegistryEntry = {
  slug: "yaml-formatter",
  name: "YAML Formatter/Validator",
  module: "data-format",
  description: "Format and validate YAML with consistent indentation and inline error reporting.",
  aliases: ["yaml formatter", "yaml validator", "yaml linter"],
  icon: "FileCode2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["yaml formatter", "yaml validator online", "yaml linter"] },
};
