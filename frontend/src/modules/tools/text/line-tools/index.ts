import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const lineToolsTool: ToolRegistryEntry = {
  slug: "line-tools",
  name: "Line Tools",
  module: "text",
  description: "Number lines, add prefixes and suffixes, join, split, reverse, trim, remove blanks, filter by text or regex, wrap to a width, indent, dedent and pull out a column, all in one place.",
  aliases: ["add line numbers","prefix each line","join lines with comma","filter lines by regex","wrap text to width"],
  icon: "ListOrdered",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["add line numbers","prefix each line","join lines with comma","filter lines by regex","wrap text to width"] },
};
