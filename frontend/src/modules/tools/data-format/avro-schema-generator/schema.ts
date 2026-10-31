import { z } from "zod";

export const avroSchemaGeneratorOptionsSchema = z.object({
  recordName: z.string().default("Root"),
  namespace: z.string().default("com.example"),
  /** missing: fields absent or null in some samples become nullable; all: every field; none: never */
  nullable: z.enum(["missing", "all", "none"]).default("missing"),
  /** Add "default": null to nullable fields (null is then placed first in the union) */
  nullDefaults: z.boolean().default(true),
  /** Detect ISO dates, timestamps and UUIDs and use Avro logical types */
  logicalTypes: z.boolean().default(false),
  /** Integers that fit 32 bits become int; long always uses long */
  integers: z.enum(["auto", "long"]).default("auto"),
  /** double or float for non-integers */
  floats: z.enum(["double", "float"]).default("double"),
  /** Objects with at least this many keys whose values share one type become maps (0 = never) */
  mapMinKeys: z.number().int().min(0).max(1000).default(0),
  /** Keep the original name in "aliases" when a key had to be renamed to a legal Avro name */
  aliases: z.boolean().default(true),
  /** avsc: the schema; registry: {"schema": "..."} body for Confluent Schema Registry; compact: one line */
  format: z.enum(["avsc", "registry", "compact"]).default("avsc"),
  /** Add a doc string noting the original JSON path of each record */
  docs: z.boolean().default(false),
});
export type AvroSchemaGeneratorOptions = z.infer<typeof avroSchemaGeneratorOptionsSchema>;
