import { z } from "zod";

export const OPENSSL_TASKS = [
  "rsa-key", "ec-key", "csr", "self-signed", "view-cert", "view-csr", "verify-chain",
  "pem-to-der", "der-to-pem", "pkcs12-export", "pkcs12-extract", "s-client", "check-key-match", "hash-file", "dhparam",
] as const;

export const opensslCommandBuilderOptionsSchema = z.object({
  task: z.enum(OPENSSL_TASKS).default("self-signed"),
  digest: z.enum(["sha256", "sha384", "sha512"]).default("sha256"),
  encryptKey: z.boolean().default(false),
});
export type OpensslCommandBuilderOptions = z.infer<typeof opensslCommandBuilderOptionsSchema>;
