import { z } from "zod";

export const uuidGeneratorOptionsSchema = z.object({
  version: z.enum(["v4", "v7"]).default("v4"),
  count: z.number().int().min(1).max(1000).default(1),
  uppercase: z.boolean().default(false),
  hyphens: z.boolean().default(true),
});
export type UuidGeneratorOptions = z.infer<typeof uuidGeneratorOptionsSchema>;
