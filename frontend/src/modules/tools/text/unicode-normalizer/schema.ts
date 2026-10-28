import { z } from "zod";

export const unicodeNormalizerOptionsSchema = z.object({
  form: z.enum(["NFC", "NFD", "NFKC", "NFKD"]).default("NFC"),
  stripDiacritics: z.boolean().default(false),
  removeInvisible: z.boolean().default(false),
  straightenQuotes: z.boolean().default(false),
  collapseSpaces: z.boolean().default(false),
});
export type UnicodeNormalizerOptions = z.infer<typeof unicodeNormalizerOptionsSchema>;
