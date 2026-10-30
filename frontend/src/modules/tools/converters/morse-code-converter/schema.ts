import { z } from "zod";

export const morseCodeOptionsSchema = z.object({
  mode: z.enum(["text-to-morse", "morse-to-text"]).default("text-to-morse"),
  /** How dots and dashes are written: .- ; ·− ; or dit/dah. */
  symbols: z.enum(["ascii", "unicode", "ditdah"]).default("ascii"),
  /** Between words: " / " (default), " | ", three spaces (ITU spacing) or a new line. */
  wordSeparator: z.enum(["slash", "pipe", "spaces", "newline"]).default("slash"),
  /** Characters with no Morse code: stop with an error, drop them, or write "?". */
  unsupported: z.enum(["error", "skip", "question"]).default("error"),
  /** Include non-English letters (Ä Á Å É Ñ Ö Ü, CH) and prosigns written as <SOS>, <AR>. */
  extended: z.boolean().default(false),
  /** Audio: character speed in words per minute (PARIS standard). */
  wpm: z.number().int().min(5).max(60).default(20),
  /** Audio: effective speed for Farnsworth spacing (≤ wpm); equal to wpm disables it. */
  farnsworthWpm: z.number().int().min(5).max(60).default(20),
  /** Audio tone in Hz. */
  frequency: z.number().int().min(200).max(1500).default(600),
});
export type MorseCodeOptions = z.infer<typeof morseCodeOptionsSchema>;

export const morseCodeInputSchema = z.string().max(100_000);
