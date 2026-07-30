import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonYamlTool: ToolRegistryEntry = {
  slug: "json-yaml",
  name: "JSON ↔ YAML",
  module: "data-format",
  description: "Convert between JSON and YAML in either direction, entirely in your browser.",
  aliases: ["json to yaml", "yaml to json", "json yaml converter"],
  icon: "FileCode",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["json to yaml converter", "yaml to json converter online"] },
};
