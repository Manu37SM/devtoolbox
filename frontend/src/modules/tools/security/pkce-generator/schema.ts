import { z } from "zod";

export const pkceGeneratorOptionsSchema = z.object({
  length: z.number().int().min(43).max(128).default(64),
});
export type PkceGeneratorOptions = z.infer<typeof pkceGeneratorOptionsSchema>;

export const pkceGeneratorInputSchema = z.string().max(1000000);
