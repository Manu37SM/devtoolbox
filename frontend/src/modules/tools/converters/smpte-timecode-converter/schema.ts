import { z } from "zod";

export const smpteTimecodeConverterOptionsSchema = z.object({
  fps: z.enum(["23.976", "24", "25", "29.97", "30", "47.952", "48", "50", "59.94", "60"]).default("29.97"),
  /** drop-frame counting (only exists at 29.97 and 59.94) */
  dropFrame: z.boolean().default(true),
  mode: z.enum(["convert", "sum", "difference", "retime"]).default("convert"),
  /** retime target */
  targetFps: z.enum(["23.976", "24", "25", "29.97", "30", "47.952", "48", "50", "59.94", "60"]).default("25"),
  /** time keeps the same real duration (nearest frame); frames keeps the same frame count (plays faster or slower) */
  retimeMethod: z.enum(["time", "frames"]).default("time"),
  /** timecode of the first frame (reel start), e.g. 01:00:00:00 */
  startTc: z.string().default("00:00:00:00"),
  output: z.enum(["table", "timecode", "frames", "seconds", "clock"]).default("table"),
});
export type SmpteTimecodeConverterOptions = z.infer<typeof smpteTimecodeConverterOptionsSchema>;
