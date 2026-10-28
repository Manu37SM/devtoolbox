import { z } from "zod";

export const passphraseGeneratorOptionsSchema = z.object({
  words: z.number().int().min(3).max(20).default(6),
  count: z.number().int().min(1).max(20).default(5),
  separator: z.enum(["hyphen", "space", "dot", "underscore", "none"]).default("hyphen"),
  capitalize: z.boolean().default(false),
  addNumber: z.boolean().default(false),
});
export type PassphraseGeneratorOptions = z.infer<typeof passphraseGeneratorOptionsSchema>;

export const passphraseGeneratorInputSchema = z.string().max(1000);
