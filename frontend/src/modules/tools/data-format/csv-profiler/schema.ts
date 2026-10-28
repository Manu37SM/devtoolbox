import { z } from "zod";

export const csvProfilerOptionsSchema = z.object({
  delimiter: z.enum(["auto", ",", ";", "\t", "|"]).default("auto"),
  topValues: z.number().int().min(0).max(10).default(3),
});
export type CsvProfilerOptions = z.infer<typeof csvProfilerOptionsSchema>;
