import { z } from "zod";

export const keyPairTypeSchema = z.enum(["rsa", "ec", "ed25519"]);
export type KeyPairType = z.infer<typeof keyPairTypeSchema>;

export const rsaModulusLengthSchema = z.union([z.literal(2048), z.literal(3072), z.literal(4096)]);
export type RsaModulusLength = z.infer<typeof rsaModulusLengthSchema>;

export const ecCurveSchema = z.enum(["P-256", "P-384", "P-521"]);
export type EcCurve = z.infer<typeof ecCurveSchema>;

export const keyFormatSchema = z.enum(["pem", "traditional", "jwk", "openssh"]);
export type KeyFormat = z.infer<typeof keyFormatSchema>;

export const rsaEcKeyPairOptionsSchema = z.object({
  keyType: keyPairTypeSchema.default("rsa"),
  rsaModulusLength: rsaModulusLengthSchema.default(2048),
  ecCurve: ecCurveSchema.default("P-256"),
  /**
   * pem = PKCS#8 / SPKI (BEGIN PRIVATE KEY); traditional = PKCS#1 (BEGIN RSA PRIVATE KEY) or SEC1
   * (BEGIN EC PRIVATE KEY) for older OpenSSL/Java tooling; jwk = JSON Web Key; openssh = public key
   * line for authorized_keys (private key stays PKCS#8, which OpenSSH reads).
   */
  format: keyFormatSchema.default("pem"),
  /** Intended use, recorded in the JWK (use/alg) and in the WebCrypto key algorithm. */
  use: z.enum(["sig", "enc"]).default("sig"),
  /** Comment appended to the OpenSSH public key line. */
  comment: z.string().max(100).default(""),
});
export type RsaEcKeyPairOptions = z.infer<typeof rsaEcKeyPairOptionsSchema>;
