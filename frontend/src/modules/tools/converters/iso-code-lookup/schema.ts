import { z } from "zod";

export const isoCodeLookupOptionsSchema = z.object({
  /** Which list to search; "all" searches all three */
  type: z.enum(["all", "country", "currency", "language"]).default("all"),
  match: z.enum(["smart", "exact", "starts", "contains"]).default("smart"),
  output: z.enum(["table", "csv", "json", "codes"]).default("table"),
  /** Lines to show per query */
  limit: z.number().int().min(1).max(500).default(25),
  /** With an empty input, list every entry of the chosen type */
  listAllWhenEmpty: z.boolean().default(true),
  includeOfficialName: z.boolean().default(false),
  /** Print one code per hit: alpha2, alpha3 or numeric (for output = codes) */
  codeForm: z.enum(["alpha2", "alpha3", "numeric"]).default("alpha2"),
});
export type IsoCodeLookupOptions = z.infer<typeof isoCodeLookupOptionsSchema>;
