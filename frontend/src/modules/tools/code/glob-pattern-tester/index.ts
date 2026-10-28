import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const globPatternTesterTool: ToolRegistryEntry = {
  slug: "glob-pattern-tester",
  name: "Glob & .gitignore Pattern Tester",
  module: "code",
  description: "Test glob patterns (**, *, ?, [abc], {a,b}) or .gitignore rules against a list of paths and see which rule matched. Supports negation, anchoring, dotfiles and case-insensitive matching.",
  aliases: ["gitignore tester","glob matcher","minimatch tester","globstar","which files match pattern"],
  icon: "FolderSearch",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["gitignore tester","glob matcher","minimatch tester","globstar","which files match pattern"] },
};
