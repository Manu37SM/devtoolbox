import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonXmlTool: ToolRegistryEntry = {
  slug: "json-xml",
  name: "JSON ↔ XML",
  module: "data-format",
  description: "Convert between JSON and XML, handling attributes and CDATA.",
  aliases: ["json to xml", "xml to json", "json xml converter"],
  icon: "FileCode",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["json to xml converter", "xml to json converter online"] },
};
