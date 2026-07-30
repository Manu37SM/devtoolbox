import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const caseConverterTool: ToolRegistryEntry = {
  slug: "case-converter",
  name: "Case Converter",
  module: "text",
  description: "Convert text between camelCase, snake_case, kebab-case, PascalCase, and more.",
  aliases: ["camel case converter", "snake case converter", "text case converter"],
  icon: "CaseSensitive",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["case converter", "camelcase to snakecase", "text case converter online"] },
};
