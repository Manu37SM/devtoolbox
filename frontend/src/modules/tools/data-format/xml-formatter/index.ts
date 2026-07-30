import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const xmlFormatterTool: ToolRegistryEntry = {
  slug: "xml-formatter",
  name: "XML Formatter/Validator",
  module: "data-format",
  description: "Format and validate XML with consistent indentation and error reporting.",
  aliases: ["xml formatter", "xml validator", "xml pretty print"],
  icon: "FileCode2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["xml formatter", "xml validator online", "xml pretty print"] },
};
