import { z } from "zod";

export const jsonSchemaGeneratorOptionsSchema = z.object({
  allRequired: z.boolean().default(true),
});
export type JsonSchemaGeneratorOptions = z.infer<typeof jsonSchemaGeneratorOptionsSchema>;

export const jsonSchemaGeneratorInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
