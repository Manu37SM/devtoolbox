import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const stringEscapeTool: ToolRegistryEntry = {
  slug: "string-escape",
  name: "String Escape / Unescape",
  module: "text",
  description: "Escape or unescape text for JSON, JavaScript, Java, SQL, regex, CSV and shell strings.",
  aliases: ["escape string","unescape string","json escape","sql escape quotes","regex escape","shell escape"],
  icon: "Quote",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["escape string","unescape string","json escape","sql escape quotes","regex escape","shell escape"] },
};
