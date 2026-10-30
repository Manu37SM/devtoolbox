import { z } from "zod";

export const punycodeModeSchema = z.enum(["encode", "decode"]);
export type PunycodeMode = z.infer<typeof punycodeModeSchema>;

export const punycodeConverterInputSchema = z.string().max(2048);

export const punycodeOptionsSchema = z.object({
  /**
   * Map input the way browsers do before encoding (UTS #46, approximated): NFKC, lower-case,
   * and full-width or ideographic dots (。．｡) as label separators.
   */
  normalize: z.boolean().default(true),
  /** Warn about labels that mix scripts or are built from look-alike letters (homograph phishing). */
  checkSpoofing: z.boolean().default(true),
});
export type PunycodeOptions = z.infer<typeof punycodeOptionsSchema>;
