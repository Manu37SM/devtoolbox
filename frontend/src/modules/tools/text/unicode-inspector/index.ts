import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const unicodeInspectorTool: ToolRegistryEntry = {
  slug: "unicode-inspector",
  name: "Unicode Inspector & Invisible Character Finder",
  module: "text",
  description: "See every code point in a string: U+ value, UTF-8/UTF-16 bytes, category and name. Find zero-width spaces, non-breaking spaces, BOMs, bidi controls and trailing whitespace, or get \\u, HTML and CSS escapes.",
  aliases: ["zero width space finder","invisible characters","utf-8 bytes of character","code point lookup","hidden unicode detector","bidi override"],
  icon: "Languages",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["zero width space finder","invisible characters","utf-8 bytes of character","code point lookup","hidden unicode detector","bidi override"] },
};
