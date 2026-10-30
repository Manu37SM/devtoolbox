import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonSchemaSampleGeneratorTool: ToolRegistryEntry = {
  slug: "json-schema-sample-generator",
  name: "JSON Schema Sample Generator",
  module: "data-format",
  description: "Generate valid example JSON from a JSON Schema: required or all properties, $ref and allOf, enums, formats, constraints, name-aware realistic values and seeded repeatable output.",
  aliases: ["schema to json", "example from json schema", "json schema faker", "mock json from schema", "sample data from schema"],
  icon: "FileBraces",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json schema sample generator", "schema to json", "example from json schema", "json schema faker", "mock json from schema", "sample data from schema"] },
};
