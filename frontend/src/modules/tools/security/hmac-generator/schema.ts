import { z } from "zod";

export const hmacAlgorithmSchema = z.enum(["SHA-1", "SHA-256", "SHA-384", "SHA-512"]);
export type HmacAlgorithm = z.infer<typeof hmacAlgorithmSchema>;

export const hmacOutputFormatSchema = z.enum(["hex", "base64"]);
export type HmacOutputFormat = z.infer<typeof hmacOutputFormatSchema>;

export const hmacGeneratorOptionsSchema = z.object({
  algorithm: hmacAlgorithmSchema.default("SHA-256"),
  outputFormat: hmacOutputFormatSchema.default("hex"),
});
export type HmacGeneratorOptions = z.infer<typeof hmacGeneratorOptionsSchema>;

export const hmacGeneratorInputSchema = z.string().max(50_000_000);
export const hmacGeneratorSecretSchema = z.string();
