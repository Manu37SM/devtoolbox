import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const avroSchemaGeneratorTool: ToolRegistryEntry = {
  slug: "avro-schema-generator",
  name: "Avro Schema Generator from JSON",
  module: "data-format",
  description: "Infer an Apache Avro schema from sample JSON: records, nullable unions, arrays, maps, logical types for dates, timestamps and UUIDs, namespace and default values, with an Avro-spec validity check.",
  aliases: ["avro schema", "avsc", "json to avro", "kafka schema registry", "avro record", "avro logical types"],
  icon: "Layers",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["avro schema generator from json", "avro schema", "avsc", "json to avro", "kafka schema registry", "avro record", "avro logical types"] },
};
