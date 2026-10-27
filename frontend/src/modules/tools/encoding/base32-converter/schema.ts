import { z } from "zod";

export const base32VariantSchema = z.enum(["rfc4648", "base32hex", "crockford"]);
export type Base32Variant = z.infer<typeof base32VariantSchema>;

export const base32OptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  variant: base32VariantSchema.default("rfc4648"),
  padding: z.boolean().default(true),
});
export type Base32Options = z.infer<typeof base32OptionsSchema>;

export const base32InputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
