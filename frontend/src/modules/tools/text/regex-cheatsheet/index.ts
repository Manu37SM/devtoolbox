import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const regexCheatsheetTool: ToolRegistryEntry = {
  slug: "regex-cheatsheet",
  name: "Regex Cheat Sheet",
  module: "text",
  description: "Searchable reference of common regular expression syntax: anchors, classes, quantifiers, and more.",
  aliases: ["regex reference", "regular expression cheat sheet", "regex syntax guide"],
  icon: "BookOpenText",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["regex cheat sheet", "regular expression syntax reference", "regex quick reference"] },
};
