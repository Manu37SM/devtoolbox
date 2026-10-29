import { z } from "zod";

export const jsonSchemaGeneratorOptionsSchema = z.object({
  allRequired: z.boolean().default(true),
  draft: z.enum(["draft-07", "2019-09", "2020-12"]).default("draft-07"),
  /** Add "format" for date-time, date, time, email, uri, uuid, ipv4 and ipv6 strings. */
  detectFormats: z.boolean().default(false),
  /** Add additionalProperties: false to every object. */
  forbidAdditional: z.boolean().default(false),
  /** Add the sample value as "examples" on scalar properties. */
  includeExamples: z.boolean().default(false),
});
export type JsonSchemaGeneratorOptions = z.infer<typeof jsonSchemaGeneratorOptionsSchema>;

export const jsonSchemaGeneratorInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
