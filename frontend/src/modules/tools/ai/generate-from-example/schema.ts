import { z } from "zod";

export const generateFromExampleTargets = ["regex", "json-schema"] as const;
export type GenerateFromExampleTarget = (typeof generateFromExampleTargets)[number];

export const generateFromExampleOptionsSchema = z.object({
  target: z.enum(generateFromExampleTargets),
  // For target "regex": one example string per line. For target
  // "json-schema": a single pasted JSON document. Kept as one free-text
  // field (rather than a discriminated union) since both cases are "paste
  // your example(s) here" from the user's point of view.
  sample: z.string().min(1).max(3_500),
});
export type GenerateFromExampleOptions = z.infer<typeof generateFromExampleOptionsSchema>;
