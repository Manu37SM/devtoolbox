import { z } from "zod";

export const timezoneConverterOptionsSchema = z.object({
  sourceTimezone: z.string().default("UTC"),
  targetTimezones: z.array(z.string()).default(["America/New_York", "Europe/London", "Asia/Tokyo"]),
});
export type TimezoneConverterOptions = z.infer<typeof timezoneConverterOptionsSchema>;
