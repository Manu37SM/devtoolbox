import { z } from "zod";

export const passwordGeneratorOptionsSchema = z
  .object({
    length: z.number().int().min(4).max(128).default(20),
    uppercase: z.boolean().default(true),
    lowercase: z.boolean().default(true),
    numbers: z.boolean().default(true),
    symbols: z.boolean().default(true),
    excludeAmbiguous: z.boolean().default(false),
  })
  .refine((o) => o.uppercase || o.lowercase || o.numbers || o.symbols, {
    message: "At least one character set must be enabled.",
  });
export type PasswordGeneratorOptions = z.infer<typeof passwordGeneratorOptionsSchema>;
