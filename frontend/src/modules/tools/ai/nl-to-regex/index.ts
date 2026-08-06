import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const nlToRegexTool: ToolRegistryEntry = {
  slug: "nl-to-regex",
  name: "Natural Language → Regex",
  module: "ai",
  description: "Describe a pattern in plain English and get a regex confirmed against your own example strings.",
  aliases: ["regex generator", "text to regex", "ai regex builder"],
  icon: "Wand2",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["natural language to regex", "ai regex generator", "generate regex from examples"] },
};

export { NlToRegexToolView } from "./ToolView";
