import { z } from "zod";

export const csvTsvOptionsSchema = z.object({
  mode: z.enum(["csv-to-tsv", "tsv-to-csv", "clean"]).default("csv-to-tsv"),
});
export type CsvTsvOptions = z.infer<typeof csvTsvOptionsSchema>;

export const csvTsvInputSchema = z.string().max(10_000_000, {
  message: "Input exceeds the 10MB client-side processing limit.",
});
