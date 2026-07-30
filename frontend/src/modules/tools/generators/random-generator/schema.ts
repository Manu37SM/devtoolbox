import { z } from "zod";

export const randomGeneratorOptionsSchema = z.union([
  z.object({
    kind: z.literal("number"),
    min: z.number().int(),
    max: z.number().int(),
    count: z.number().int().min(1).max(1000).default(1),
    allowDuplicates: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal("string"),
    length: z.number().int().min(1).max(256).default(16),
    count: z.number().int().min(1).max(1000).default(1),
    charset: z.enum(["alphanumeric", "alpha", "numeric", "hex"]).default("alphanumeric"),
  }),
]);
export type RandomGeneratorOptions = z.infer<typeof randomGeneratorOptionsSchema>;
