

import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonFormatterTool: ToolRegistryEntry = {
  slug: "json-formatter",
  name: "JSON Formatter",
  module: "data-format",
  description:
    "Format, validate, and minify JSON with syntax error highlighting and line numbers.",
  aliases: ["json beautifier", "json validator", "pretty print json", "json minifier"],
  icon: "Braces",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["json formatter", "json validator", "json beautifier", "pretty print json"],
  },
};
