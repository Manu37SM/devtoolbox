import { z } from "zod";

export const stringCounterInputSchema = z.string().max(10_000_000);

export const stringCounterOptionsSchema = z.object({
  /** How a "character" is counted for the headline figure and the limit. */
  charMode: z.enum(["codepoints", "graphemes", "utf16"]).default("codepoints"),
  /** whitespace = split on spaces; locale = Intl word segmentation (counts Chinese/Japanese/Thai words). */
  wordMode: z.enum(["whitespace", "locale"]).default("whitespace"),
  /** Reading speed for the time estimate. */
  wpm: z.number().int().min(50).max(1000).default(200),
  /** Character limit to check against: a preset or "custom" (uses customLimit). */
  limit: z.enum(["none", "tweet", "sms", "metaTitle", "metaDescription", "custom"]).default("none"),
  customLimit: z.number().int().min(1).max(10_000_000).default(500),
});
export type StringCounterOptions = z.infer<typeof stringCounterOptionsSchema>;
