import { z } from "zod";

export const morseCodeOptionsSchema = z.object({
  mode: z.enum(["text-to-morse", "morse-to-text"]).default("text-to-morse"),
});
export type MorseCodeOptions = z.infer<typeof morseCodeOptionsSchema>;

export const morseCodeInputSchema = z.string().max(100_000);
