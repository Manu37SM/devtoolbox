import { z } from "zod";

export const julianDateConverterOptionsSchema = z.object({
  inputFormat: z.enum(["auto", "gregorian", "julian-calendar", "ordinal", "yyddd", "cyyddd", "jd", "mjd", "lilian", "rata-die", "excel1900", "excel1904", "yyyymmdd"]).default("auto"),
  /** table: every format for each line; or a single format, one result per line */
  output: z.enum(["table", "gregorian", "julian-calendar", "yyddd", "cyyddd", "yyyyddd", "jd", "jdn", "mjd", "lilian", "rata-die", "excel1900", "excel1904", "weekday"]).default("table"),
  /** first year of the 100-year window used for two-digit years (YYDDD) */
  pivotStart: z.number().int().min(0).max(9900).default(1970),
  /** ISO text vs. 12/31/2024-style output for dates */
  dateStyle: z.enum(["iso", "dmy", "long"]).default("iso"),
});
export type JulianDateConverterOptions = z.infer<typeof julianDateConverterOptionsSchema>;
