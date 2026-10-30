import { z } from "zod";

export const HASH_ALGORITHMS = [
  "MD5",
  "SHA-1",
  "SHA-224",
  "SHA-256",
  "SHA-384",
  "SHA-512",
  "SHA3-256",
  "SHA3-512",
  "Keccak-256",
  "BLAKE2b-256",
  "BLAKE2b-512",
  "BLAKE3",
  "RIPEMD-160",
  "SM3",
  "xxHash64",
  "CRC32",
] as const;

export const hashAlgorithmSchema = z.enum(HASH_ALGORITHMS);
export type HashAlgorithm = z.infer<typeof hashAlgorithmSchema>;

export const hashGeneratorOptionsSchema = z.object({
  algorithm: hashAlgorithmSchema.default("SHA-256"),
  uppercase: z.boolean().default(false),
  outputEncoding: z.enum(["hex", "base64", "base64url"]).default("hex"),
  /** Text mode: hash the UTF-8 text, or the bytes written as hex. */
  inputFormat: z.enum(["text", "hex"]).default("text"),
});
export type HashGeneratorOptions = z.infer<typeof hashGeneratorOptionsSchema>;

export const hashGeneratorInputSchema = z.string().max(50_000_000);
