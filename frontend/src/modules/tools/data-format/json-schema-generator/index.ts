import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonSchemaGeneratorTool: ToolRegistryEntry = {
  slug: "json-schema-generator",
  name: "JSON Schema Generator",
  module: "data-format",
  description: "Infer a draft-07 JSON Schema from a sample JSON document.",
  aliases: ["generate json schema", "json to schema", "schema inference"],
  icon: "FileJson",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["json schema generator", "generate json schema from json", "json to json schema"],
  },
};
