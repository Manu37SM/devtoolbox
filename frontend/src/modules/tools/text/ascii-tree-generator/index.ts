import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const asciiTreeGeneratorTool: ToolRegistryEntry = {
  slug: "ascii-tree-generator",
  name: "ASCII Tree Generator",
  module: "text",
  description: "Turn file paths, an indented outline or existing tree output into an ASCII/Unicode directory tree, with sorting, depth limits, summary counts, paths, Markdown and JSON output.",
  aliases: ["directory tree", "tree command", "folder structure", "file tree", "project structure diagram"],
  icon: "FolderTree",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ascii tree generator", "directory tree", "tree command", "folder structure", "file tree", "project structure diagram"] },
};
