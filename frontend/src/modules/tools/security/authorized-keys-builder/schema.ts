import { z } from "zod";

export const authorizedKeysBuilderOptionsSchema = z.object({
  /** restrict (OpenSSH ≥ 7.2) switches off forwarding, pty, user rc in one word */
  restrict: z.boolean().default(false),
  noPortForwarding: z.boolean().default(false),
  noAgentForwarding: z.boolean().default(false),
  noX11Forwarding: z.boolean().default(false),
  noPty: z.boolean().default(false),
  noUserRc: z.boolean().default(false),
  from: z.string().default(""),
  command: z.string().default(""),
  expiry: z.string().default(""),
  permitOpen: z.string().default(""),
  /** Keep options already present on pasted lines instead of replacing them */
  keepExisting: z.boolean().default(false),
  fingerprints: z.boolean().default(true),
  /** Add this comment to keys that have none */
  defaultComment: z.string().default(""),
  dedupe: z.boolean().default(true),
});
export type AuthorizedKeysBuilderOptions = z.infer<typeof authorizedKeysBuilderOptionsSchema>;
