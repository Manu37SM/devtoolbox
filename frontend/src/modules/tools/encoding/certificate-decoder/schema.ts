import { z } from "zod";

export const certificateDecoderInputSchema = z.string().max(200_000);

export const certificateDecoderOptionsSchema = z.object({
  /** openssl = /C=US/O=Org/CN=host (old default); rfc2253 = CN=host,O=Org,C=US (Java, LDAP, openssl -nameopt RFC2253). */
  dnStyle: z.enum(["openssl", "rfc2253"]).default("openssl"),
  /** colon = AA:BB:CC (openssl, keytool); hex = aabbcc. */
  fingerprintStyle: z.enum(["colon", "hex"]).default("colon"),
  /** Flag certificates that expire within this many days. */
  expiryWarningDays: z.number().int().min(0).max(3650).default(30),
});
export type CertificateDecoderOptions = z.infer<typeof certificateDecoderOptionsSchema>;
