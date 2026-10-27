import { z } from "zod";

export const propertiesYamlOptionsSchema = z.object({
  mode: z.enum(["properties-to-yaml", "yaml-to-properties"]).default("properties-to-yaml"),
  inferTypes: z.boolean().default(true),
  escapeUnicode: z.boolean().default(false),
});
export type PropertiesYamlOptions = z.infer<typeof propertiesYamlOptionsSchema>;

export const propertiesYamlInputSchema = z.string().max(1000000);
