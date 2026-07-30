import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const regexTesterTool: ToolRegistryEntry = {
  slug: "regex-tester",
  name: "Regex Tester/Debugger",
  module: "text",
  description: "Test regular expressions with live match highlighting, capture groups, and replace preview.",
  aliases: ["regex tester", "regex debugger", "regular expression tester"],
  icon: "Regex",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["regex tester online", "regular expression tester", "regex debugger"] },
};
