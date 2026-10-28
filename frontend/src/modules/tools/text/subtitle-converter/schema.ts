import { z } from "zod";

export const subtitleConverterOptionsSchema = z.object({
  target: z.enum(["vtt", "srt"]).default("vtt"),
  shiftMs: z.number().int().min(-3600000).max(3600000).default(0),
});
export type SubtitleConverterOptions = z.infer<typeof subtitleConverterOptionsSchema>;
