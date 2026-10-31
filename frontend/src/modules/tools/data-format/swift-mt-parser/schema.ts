import { z } from "zod";

export const swiftMtParserOptionsSchema = z.object({
  /** summary: readable report, json: structured, fields: one line per tag */
  output: z.enum(["summary", "json", "fields"]).default("summary"),
  /** Check mandatory tags and formats for the message type */
  validate: z.boolean().default(true),
  /** Show header blocks 1, 2, 3 and 5 */
  headers: z.boolean().default(true),
  /** Two-digit year pivot: years 00 to this value are 20xx, the rest 19xx */
  yearPivot: z.number().int().min(0).max(99).default(79),
  /** Show amounts with thousands separators in the summary */
  groupAmounts: z.boolean().default(true),
});
export type SwiftMtParserOptions = z.infer<typeof swiftMtParserOptionsSchema>;
