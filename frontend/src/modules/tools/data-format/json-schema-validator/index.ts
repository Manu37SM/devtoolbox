import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonSchemaValidatorTool: ToolRegistryEntry = {
  slug: "json-schema-validator",
  name: "JSON Schema Validator",
  module: "data-format",
  description: "Validate JSON against a JSON Schema (draft 7 to 2020-12): types, required, formats, patterns, combinators, if/then/else and local $ref, listing every error with its JSON pointer.",
  aliases: ["json schema validate online","validate json against schema","ajv alternative","json schema checker","draft 2020-12 validator"],
  icon: "ShieldCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json schema validate online","validate json against schema","ajv alternative","json schema checker","draft 2020-12 validator"] },
};
