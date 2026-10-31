import { z } from "zod";

export const knownHostsHasherOptionsSchema = z.object({
  action: z.enum(["hash", "match"]).default("hash"),
  /** hash: port to wrap plain host names with ([host]:port); 22 leaves them alone */
  port: z.number().int().min(1).max(65535).default(22),
  /** hash: fixed 20-byte salt as base64 for reproducible output; empty = fresh random salt per entry */
  salt: z.string().default(""),
  /** hash: lower-case host names first (OpenSSH looks hosts up in lower case) */
  lowercase: z.boolean().default(true),
});
export type KnownHostsHasherOptions = z.infer<typeof knownHostsHasherOptionsSchema>;
