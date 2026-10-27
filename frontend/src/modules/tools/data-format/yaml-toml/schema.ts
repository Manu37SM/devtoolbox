import { z } from "zod";

export const yamlTomlOptionsSchema = z.object({
  mode: z.enum(["yaml-to-toml", "toml-to-yaml"]).default("yaml-to-toml"),
  indent: z.enum(["2", "4"]).default("2"),
});
export type YamlTomlOptions = z.infer<typeof yamlTomlOptionsSchema>;

export const yamlTomlInputSchema = z.string().max(1000000);
