import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonToTypesTool: ToolRegistryEntry = {
  slug: "json-to-types",
  name: "JSON to Types",
  module: "data-format",
  description: "Generate TypeScript, Go, or Python type definitions from a sample JSON document.",
  aliases: ["json to typescript", "json to interface", "json to struct", "json to dataclass"],
  icon: "FileCode",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["json to typescript", "json to go struct", "json to python dataclass", "json to types"],
  },
};
