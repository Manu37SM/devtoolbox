import { z } from "zod";

export const romanNumeralModeSchema = z.enum(["to-roman", "from-roman"]);
export type RomanNumeralMode = z.infer<typeof romanNumeralModeSchema>;

export const romanNumeralConverterInputSchema = z.string().max(64);

export const romanNumeralOptionsSchema = z.object({
  /** ascii = MCMXCIV; unicode = Roman numeral code points (Ⅿ Ⅽ…, and Ⅰ–Ⅻ as single glyphs). */
  style: z.enum(["ascii", "unicode"]).default("ascii"),
  lowercase: z.boolean().default(false),
  /** Allow 4,000 – 3,999,999 using a vinculum (overline = × 1000), e.g. V̅ = 5000. */
  vinculum: z.boolean().default(false),
  /** Clock-face four: IIII instead of IV. */
  clockFour: z.boolean().default(false),
  /** Reject non-canonical numerals like IIII or IC when reading; off accepts them. */
  strict: z.boolean().default(true),
});
export type RomanNumeralOptions = z.infer<typeof romanNumeralOptionsSchema>;
