import { z } from "zod";

export const yamlAnchorExpanderOptionsSchema = z.object({
  output: z.enum(["yaml", "json"]).default("yaml"),
  sortKeys: z.boolean().default(false),
});
export type YamlAnchorExpanderOptions = z.infer<typeof yamlAnchorExpanderOptionsSchema>;
