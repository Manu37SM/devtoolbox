import { z } from "zod";

export const musicNoteFrequencyOptionsSchema = z.object({
  a4: z.number().min(380).max(480).default(440),
  accidentals: z.enum(["sharp", "flat"]).default("sharp"),
  speedOfSound: z.boolean().default(true),
});
export type MusicNoteFrequencyOptions = z.infer<typeof musicNoteFrequencyOptionsSchema>;
