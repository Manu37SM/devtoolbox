import { z } from "zod";

export const EPOCH_SOURCES = ["unix-s", "unix-ms", "unix-us", "unix-ns", "windows-filetime", "dotnet-ticks", "excel-serial", "apple-cocoa", "webkit", "julian-day", "gps-seconds", "iso"] as const;

export const epochFormatConverterOptionsSchema = z.object({
  from: z.enum(EPOCH_SOURCES).default("unix-s"),
});
export type EpochFormatConverterOptions = z.infer<typeof epochFormatConverterOptionsSchema>;
