import { z } from "zod";

export const jsonSchemaSampleGeneratorOptionsSchema = z.object({
  /** "required" fills only required properties; "all" fills every property. */
  fill: z.enum(["required", "all"]).default("all"),
  /** Prefer default/const/examples/enum values from the schema over generated ones. */
  useExamples: z.boolean().default(true),
  /** Pick values from the property name ("email", "firstName", "createdAt") when the schema allows it. */
  smartValues: z.boolean().default(true),
  /** Items per array (clamped to minItems/maxItems). */
  arrayLength: z.number().int().min(0).max(20).default(2),
  /** Which oneOf/anyOf branch to use, counting from 0. */
  variant: z.number().int().min(0).max(50).default(0),
  /** Random seed: the same schema and seed give the same data. */
  seed: z.number().int().min(0).max(2_147_483_647).default(1),
  /** Number of samples to generate (more than 1 prints an array or NDJSON). */
  count: z.number().int().min(1).max(100).default(1),
  /** How far to follow recursive $refs before giving up. */
  maxDepth: z.number().int().min(1).max(12).default(5),
  format: z.enum(["pretty", "compact", "ndjson"]).default("pretty"),
});
export type JsonSchemaSampleGeneratorOptions = z.infer<typeof jsonSchemaSampleGeneratorOptionsSchema>;

export const jsonSchemaSampleGeneratorInputSchema = z.string().max(2_000_000);
