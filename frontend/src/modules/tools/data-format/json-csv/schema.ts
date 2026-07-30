import { z } from "zod";

export const jsonCsvOptionsSchema = z.object({
  mode: z.enum(["json-to-csv", "csv-to-json"]).default("json-to-csv"),
  delimiter: z.enum([",", ";", "\t"]).default(","),
  flattenNested: z.boolean().default(true),
});
export type JsonCsvOptions = z.infer<typeof jsonCsvOptionsSchema>;

export const jsonCsvInputSchema = z.string().max(10_000_000);
