import { z } from "zod";

export const numberToWordsOptionsSchema = z.object({
  mode: z.enum(["to-words", "to-number"]).default("to-words"),
  style: z.enum(["cardinal", "ordinal"]).default("cardinal"),
  useAnd: z.boolean().default(false),
});
export type NumberToWordsOptions = z.infer<typeof numberToWordsOptionsSchema>;

export const numberToWordsInputSchema = z.string().max(2_000);
