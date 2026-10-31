import { z } from "zod";

export const unixCryptHashGeneratorOptionsSchema = z.object({
  action: z.enum(["hash", "verify"]).default("hash"),
  algorithm: z.enum(["sha512", "sha256", "md5"]).default("sha512"),
  /** Empty = random salt per password; MD5 allows 8 characters, SHA 16 */
  salt: z.string().default(""),
  /** SHA-crypt cost, 1000–200,000 (glibc default 5000; useradd/chpasswd often use 5000, modern distros 10000+) */
  rounds: z.number().int().min(1000).max(200000).default(5000),
  /** Print rounds=N even when it equals the default 5000 */
  explicitRounds: z.boolean().default(false),
});
export type UnixCryptHashGeneratorOptions = z.infer<typeof unixCryptHashGeneratorOptionsSchema>;
