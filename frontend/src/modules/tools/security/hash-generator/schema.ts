import { z } from "zod";

export const hashAlgorithmSchema = z.enum(["MD5", "SHA-1", "SHA-256", "SHA-512"]);
export type HashAlgorithm = z.infer<typeof hashAlgorithmSchema>;

export const hashGeneratorOptionsSchema = z.object({
  algorithm: hashAlgorithmSchema.default("SHA-256"),
  uppercase: z.boolean().default(false),
});
export type HashGeneratorOptions = z.infer<typeof hashGeneratorOptionsSchema>;

export const hashGeneratorInputSchema = z.string().max(50_000_000);
