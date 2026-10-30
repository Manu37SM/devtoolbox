import { z } from "zod";

export const sshConfigGeneratorOptionsSchema = z.object({
  /** User for hosts that do not name one. */
  defaultUser: z.string().max(60).default(""),
  /** IdentityFile for hosts that do not name a key. */
  defaultKey: z.string().max(200).default(""),
  /** Only offer the configured key(s), never every key in the agent. */
  identitiesOnly: z.boolean().default(true),
  addKeysToAgent: z.boolean().default(false),
  /** macOS: store passphrases in the keychain. */
  useKeychain: z.boolean().default(false),
  forwardAgent: z.boolean().default(false),
  /** ServerAliveInterval in seconds (0 = off). */
  keepAlive: z.number().int().min(0).max(3600).default(60),
  compression: z.boolean().default(false),
  /** Reuse one connection per host (ControlMaster auto, ControlPersist). */
  multiplexing: z.boolean().default(false),
  hostKeyChecking: z.enum(["default", "yes", "accept-new", "no"]).default("default"),
  /** Write the shared settings as a final "Host *" block. */
  globalBlock: z.boolean().default(true),
  comments: z.boolean().default(true),
});
export type SshConfigGeneratorOptions = z.infer<typeof sshConfigGeneratorOptionsSchema>;

export const sshConfigGeneratorInputSchema = z.string().max(100_000);
