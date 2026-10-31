import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const lineEndingConverterTool: ToolRegistryEntry = {
  slug: "line-ending-converter",
  name: "Line Endings & Whitespace Fixer",
  module: "text",
  description: "Detect and fix line endings (LF, CRLF, CR), BOM, trailing spaces, tabs versus spaces, blank-line runs, final newline and invisible characters, with a report of what changed.",
  aliases: ["crlf to lf", "dos2unix", "unix2dos", "remove bom", "trim trailing whitespace", "tabs to spaces", "normalize line endings", "zero width space remover"],
  icon: "Pilcrow",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["line endings & whitespace fixer", "crlf to lf", "dos2unix", "unix2dos", "remove bom", "trim trailing whitespace", "tabs to spaces", "normalize line endings", "zero width space remover"] },
};
