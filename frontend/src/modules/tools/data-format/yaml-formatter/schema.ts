import { z } from "zod";

export const yamlFormatterOptionsSchema = z.object({
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
});
export type YamlFormatterOptions = z.infer<typeof yamlFormatterOptionsSchema>;

export const yamlFormatterInputSchema = z.string().max(5_000_000);
