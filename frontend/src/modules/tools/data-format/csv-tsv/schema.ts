import { z } from "zod";

export const csvTsvOptionsSchema = z.object({
  mode: z.enum(["csv-to-tsv", "tsv-to-csv", "clean"]).default("csv-to-tsv"),
  /** Separator on the CSV side; ";" is common in European spreadsheet exports. */
  csvDelimiter: z.enum([",", ";", "|"]).default(","),
  quoteAll: z.boolean().default(false),
  trimFields: z.boolean().default(false),
  /** RFC 4180 and Excel use CRLF. */
  lineEnding: z.enum(["lf", "crlf"]).default("lf"),
});
export type CsvTsvOptions = z.infer<typeof csvTsvOptionsSchema>;

export const csvTsvInputSchema = z.string().max(10_000_000, {
  message: "Input exceeds the 10MB client-side processing limit.",
});
