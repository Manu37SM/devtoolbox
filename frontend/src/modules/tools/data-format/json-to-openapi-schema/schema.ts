import { z } from "zod";

export const jsonToOpenapiSchemaOptionsSchema = z.object({
  version: z.enum(["3.1", "3.0"]).default("3.1"),
  output: z.enum(["schema", "spec"]).default("schema"),
  format: z.enum(["yaml", "json"]).default("yaml"),
  method: z.enum(["post", "get", "put", "patch"]).default("post"),
  includeExamples: z.boolean().default(true),
});
export type JsonToOpenapiSchemaOptions = z.infer<typeof jsonToOpenapiSchemaOptionsSchema>;
