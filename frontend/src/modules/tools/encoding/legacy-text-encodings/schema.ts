import { z } from "zod";

export const legacyTextEncodingsOptionsSchema = z.object({
  encoding: z.enum(["quoted-printable", "ascii85", "z85", "base45", "uuencode"]).default("quoted-printable"),
  direction: z.enum(["encode", "decode"]).default("encode"),
});
export type LegacyTextEncodingsOptions = z.infer<typeof legacyTextEncodingsOptionsSchema>;
