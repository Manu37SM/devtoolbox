import { z } from "zod";

export const htpasswdGeneratorOptionsSchema = z.object({
  /** bcrypt is what Apache recommends (htpasswd -B); APR1-MD5 and SHA-1 are kept for old servers. */
  algorithm: z.enum(["apr1", "sha1", "bcrypt"]).default("apr1"),
  /** bcrypt work factor: each step doubles the time to check a password. */
  bcryptCost: z.number().int().min(4).max(17).default(10),
});
export type HtpasswdGeneratorOptions = z.infer<typeof htpasswdGeneratorOptionsSchema>;
