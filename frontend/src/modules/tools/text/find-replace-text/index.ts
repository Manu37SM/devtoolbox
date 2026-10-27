import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const findReplaceTextTool: ToolRegistryEntry = {
  slug: "find-replace-text",
  name: "Find & Replace",
  module: "text",
  description: "Find and replace text in bulk with optional regex, capture groups, case and whole-word matching.",
  aliases: ["replace text","regex replace","bulk replace","search and replace"],
  icon: "Replace",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["replace text","regex replace","bulk replace","search and replace"] },
};
