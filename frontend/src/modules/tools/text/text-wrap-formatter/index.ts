import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const textWrapFormatterTool: ToolRegistryEntry = {
  slug: "text-wrap-formatter",
  name: "Text Wrap & Reflow",
  module: "text",
  description: "Hard-wrap or unwrap text at any column: reflow comments and commit messages, add or detect a line prefix, set first-line and hanging indents, and align left, right, centred or justified.",
  aliases: ["word wrap", "reflow text", "fold text", "hard wrap", "line wrap", "justify text", "wrap comments"],
  icon: "TextWrap",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["text wrap & reflow", "word wrap", "reflow text", "fold text", "hard wrap", "line wrap", "justify text", "wrap comments"] },
};
