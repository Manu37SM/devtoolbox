import { z } from "zod";

export const yamlFormatterOptionsSchema = z.object({
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
  sortKeys: z.boolean().default(false),
  /** "auto" quotes only where YAML requires it. */
  quoteStyle: z.enum(["auto", "single", "double"]).default("auto"),
  /** Indent "- item" lines under their key; off gives the compact Kubernetes style. */
  indentSequences: z.boolean().default(true),
});
export type YamlFormatterOptions = z.infer<typeof yamlFormatterOptionsSchema>;

export const yamlFormatterInputSchema = z.string().max(5_000_000);
