import { z } from "zod";

export const jwtDecoderOptionsSchema = z.object({
  /** HMAC secret for HS256/384/512 tokens. */
  verifySecret: z.string().optional(),
  /** How the HMAC secret is written. Some providers (Auth0 legacy, many Java configs) use base64. */
  secretEncoding: z.enum(["utf8", "base64", "base64url", "hex"]).default("utf8"),
  /** Public key for RS/PS/ES tokens: PEM public key, X.509 certificate, a JWK, or a JWKS (picked by kid). */
  publicKey: z.string().default(""),
  /** Clock skew allowed when checking exp / nbf / iat, in seconds. */
  leewaySeconds: z.number().int().min(0).max(86_400).default(0),
  /** If set, the iss claim must equal this. */
  expectedIssuer: z.string().default(""),
  /** If set, the aud claim must equal (or, for an array, contain) this. */
  expectedAudience: z.string().default(""),
});
export type JwtDecoderOptions = z.infer<typeof jwtDecoderOptionsSchema>;

export const jwtDecoderInputSchema = z.string().max(50_000);
