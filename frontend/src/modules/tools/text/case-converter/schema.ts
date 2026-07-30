import { z } from "zod";

export const caseTargetSchema = z.enum([
  "camel",
  "pascal",
  "snake",
  "kebab",
  "constant",
  "title",
  "sentence",
  "upper",
  "lower",
]);
export type CaseTarget = z.infer<typeof caseTargetSchema>;

export const caseConverterOptionsSchema = z.object({ target: caseTargetSchema.default("camel") });
export type CaseConverterOptions = z.infer<typeof caseConverterOptionsSchema>;

export const caseConverterInputSchema = z.string().max(1_000_000);
