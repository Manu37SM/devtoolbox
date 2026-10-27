import { z } from "zod";

export const ulidNanoidGeneratorOptionsSchema = z.object({
  mode: z.enum(["generate", "decode"]).default("generate"),
  kind: z.enum(["ulid", "nanoid"]).default("ulid"),
  count: z.number().int().min(1).max(1000).default(5),
  length: z.number().int().min(1).max(256).default(21),
  alphabet: z.string().max(10000).default(""),
  lowercase: z.boolean().default(false),
});
export type UlidNanoidGeneratorOptions = z.infer<typeof ulidNanoidGeneratorOptionsSchema>;

export const ulidNanoidGeneratorInputSchema = z.string().max(1000000);
