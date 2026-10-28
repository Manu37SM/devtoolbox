import { z } from "zod";

export const securityTxtGeneratorOptionsSchema = z.object({
  expiresInDays: z.number().int().min(1).max(366).default(365),
  baseDate: z.string().default(""),
});
export type SecurityTxtGeneratorOptions = z.infer<typeof securityTxtGeneratorOptionsSchema>;

export const securityTxtGeneratorInputSchema = z.string().max(20_000);
