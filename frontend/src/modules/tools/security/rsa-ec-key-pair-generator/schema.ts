import { z } from "zod";

export const keyPairTypeSchema = z.enum(["rsa", "ec"]);
export type KeyPairType = z.infer<typeof keyPairTypeSchema>;

export const rsaModulusLengthSchema = z.union([z.literal(2048), z.literal(3072), z.literal(4096)]);
export type RsaModulusLength = z.infer<typeof rsaModulusLengthSchema>;

export const ecCurveSchema = z.enum(["P-256", "P-384", "P-521"]);
export type EcCurve = z.infer<typeof ecCurveSchema>;

export const rsaEcKeyPairOptionsSchema = z.object({
  keyType: keyPairTypeSchema.default("rsa"),
  rsaModulusLength: rsaModulusLengthSchema.default(2048),
  ecCurve: ecCurveSchema.default("P-256"),
});
export type RsaEcKeyPairOptions = z.infer<typeof rsaEcKeyPairOptionsSchema>;
