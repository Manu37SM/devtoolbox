import { z } from "zod";

export const sshKeyFingerprintOptionsSchema = z.object({
  format: z.enum(["both", "sha256", "md5"]).default("both"),
});
export type SshKeyFingerprintOptions = z.infer<typeof sshKeyFingerprintOptionsSchema>;

export const sshKeyFingerprintInputSchema = z.string().max(200_000);
