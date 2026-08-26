import { z } from "zod";

export const generateFromExampleTargets = ["regex", "json-schema"] as const;
export type GenerateFromExampleTarget = (typeof generateFromExampleTargets)[number];

export const generateFromExampleOptionsSchema = z.object({
  target: z.enum(generateFromExampleTargets),

  sample: z.string().min(1).max(3_500),
});
export type GenerateFromExampleOptions = z.infer<typeof generateFromExampleOptionsSchema>;
