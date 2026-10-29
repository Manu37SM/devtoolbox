import { z } from "zod";

export const jsonSchemaValidatorOptionsSchema = z.object({
  assertFormats: z.boolean().default(true),
});
export type JsonSchemaValidatorOptions = z.infer<typeof jsonSchemaValidatorOptionsSchema>;
