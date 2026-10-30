import { z } from "zod";

export const caseTargetSchema = z.enum([
  "camel",
  "pascal",
  "snake",
  "kebab",
  "constant",
  "dot",
  "path",
  "train",
  "title",
  "sentence",
  "upper",
  "lower",
]);
export type CaseTarget = z.infer<typeof caseTargetSchema>;

export const caseConverterOptionsSchema = z.object({
  target: caseTargetSchema.default("camel"),
  /** Convert each line separately (a list of identifiers) instead of the whole text as one. */
  perLine: z.boolean().default(false),
  /** Keep all-caps words such as ID, URL, XML as they are in camel/Pascal/Title output (userID, XMLParser). */
  preserveAcronyms: z.boolean().default(false),
  /** Treat digit runs as their own words: version2Update -> version_2_update. */
  splitDigits: z.boolean().default(false),
  /** Title case that keeps short words (a, of, the, in...) lower-case except first and last. */
  smartTitle: z.boolean().default(false),
});
export type CaseConverterOptions = z.infer<typeof caseConverterOptionsSchema>;

export const caseConverterInputSchema = z.string().max(1_000_000);
