import { z } from "zod";

const sort = z.enum(["none", "asc", "desc"]).default("none");

export const randomGeneratorOptionsSchema = z.union([
  z.object({
    kind: z.literal("number"),
    min: z.number(),
    max: z.number(),
    count: z.number().int().min(1).max(1000).default(1),
    allowDuplicates: z.boolean().default(true),
    /** 0 = integers; 1-10 = decimals with that many places */
    decimals: z.number().int().min(0).max(10).default(0),
    sort,
    /** Pad integers with leading zeros to the width of the largest value */
    zeroPad: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("string"),
    length: z.number().int().min(1).max(256).default(16),
    count: z.number().int().min(1).max(1000).default(1),
    charset: z
      .enum(["alphanumeric", "alpha", "numeric", "hex", "hexUpper", "lower", "upper", "base64url", "base32", "symbols", "custom"])
      .default("alphanumeric"),
    customCharset: z.string().max(500).default(""),
    excludeAmbiguous: z.boolean().default(false),
    unique: z.boolean().default(false),
    prefix: z.string().max(50).default(""),
    suffix: z.string().max(50).default(""),
    sort,
  }),
]);
export type RandomGeneratorOptions = z.infer<typeof randomGeneratorOptionsSchema>;
export type RandomGeneratorInput = z.input<typeof randomGeneratorOptionsSchema>;
