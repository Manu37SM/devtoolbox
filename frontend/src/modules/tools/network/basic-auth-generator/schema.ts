import { z } from "zod";

export const basicAuthGeneratorOptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  format: z.enum(["header", "value", "base64", "curl"]).default("header"),
});
export type BasicAuthGeneratorOptions = z.infer<typeof basicAuthGeneratorOptionsSchema>;

export const basicAuthGeneratorInputSchema = z.string().max(1000000);
