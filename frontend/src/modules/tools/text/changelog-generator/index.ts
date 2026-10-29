import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const changelogGeneratorTool: ToolRegistryEntry = {
  slug: "changelog-generator",
  name: "Changelog Generator (Conventional Commits)",
  module: "text",
  description: "Turn git log output into a Markdown changelog grouped by Conventional Commit type, with breaking changes first, commit and PR links, and the next semantic version.",
  aliases: ["conventional changelog","release notes from git log","semver bump calculator","changelog md generator","git log to changelog"],
  icon: "Tags",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["conventional changelog","release notes from git log","semver bump calculator","changelog md generator","git log to changelog"] },
};
