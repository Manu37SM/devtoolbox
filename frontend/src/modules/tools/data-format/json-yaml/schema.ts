import { z } from "zod";

export const jsonYamlOptionsSchema = z.object({
  mode: z.enum(["json-to-yaml", "yaml-to-json"]).default("json-to-yaml"),
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
  sortKeys: z.boolean().default(false),
  /** "auto" quotes only where YAML requires it. */
  quoteStyle: z.enum(["auto", "single", "double"]).default("auto"),
  /** Indent "- item" lines under their key; off gives the compact Kubernetes style. */
  indentSequences: z.boolean().default(true),
});
export type JsonYamlOptions = z.infer<typeof jsonYamlOptionsSchema>;

export const jsonYamlInputSchema = z.string().max(5_000_000);
