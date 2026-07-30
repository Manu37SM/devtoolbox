// Reference implementation of the tool contract described in
// DEVELOPMENT_GUIDE.md §5. New tools should follow this exact shape:
// index.ts (registry entry) + transform.ts + transform.test.ts +
// schema.ts + ToolView.tsx + content.mdx.

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
