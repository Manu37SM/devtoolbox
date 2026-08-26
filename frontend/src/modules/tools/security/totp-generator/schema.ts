import { z } from "zod";

export const totpAlgorithmSchema = z.enum(["SHA-1", "SHA-256", "SHA-512"]);
export type TotpAlgorithm = z.infer<typeof totpAlgorithmSchema>;

export const totpGeneratorOptionsSchema = z.object({
  secret: z.string().min(1).max(256),
  digits: z.union([z.literal(6), z.literal(8)]).default(6),
  period: z.number().int().min(15).max(120).default(30),
  algorithm: totpAlgorithmSchema.default("SHA-1"),
});
export type TotpGeneratorOptions = z.infer<typeof totpGeneratorOptionsSchema>;
