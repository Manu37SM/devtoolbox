import { z } from "zod";

export const gitignoreGeneratorOptionsSchema = z.object({
  dedupe: z.boolean().default(true),
});
export type GitignoreGeneratorOptions = z.infer<typeof gitignoreGeneratorOptionsSchema>;

export const gitignoreGeneratorInputSchema = z.string().max(1000000);
