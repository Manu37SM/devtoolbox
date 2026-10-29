import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonToOpenapiSchemaTool: ToolRegistryEntry = {
  slug: "json-to-openapi-schema",
  name: "JSON to OpenAPI Schema",
  module: "data-format",
  description: "Generate OpenAPI 3.0 or 3.1 component schemas from a JSON sample, with $ref components for nested objects, detected formats, required fields and examples, or a full path spec.",
  aliases: ["json to openapi","json to swagger schema","openapi component generator","json sample to yaml schema","generate openapi from response"],
  icon: "BookOpenCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json to openapi","json to swagger schema","openapi component generator","json sample to yaml schema","generate openapi from response"] },
};
