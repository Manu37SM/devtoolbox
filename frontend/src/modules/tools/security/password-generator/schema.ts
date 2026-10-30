import { z } from "zod";

export const passwordGeneratorOptionsSchema = z
  .object({
    length: z.number().int().min(4).max(128).default(20),
    uppercase: z.boolean().default(true),
    lowercase: z.boolean().default(true),
    numbers: z.boolean().default(true),
    symbols: z.boolean().default(true),
    excludeAmbiguous: z.boolean().default(false),
    /** Characters never to use, e.g. quotes and $ for shell, .env or JDBC URLs. */
    excludeChars: z.string().max(200).default(""),
    /** "safe" keeps to - _ . ~ which need no escaping in URLs, shells or connection strings. */
    symbolSet: z.enum(["full", "safe"]).default("full"),
    /** Guarantee at least one character from every enabled set (common password policies). */
    requireEach: z.boolean().default(false),
    count: z.number().int().min(1).max(50).default(1),
  })
  .refine((o) => o.uppercase || o.lowercase || o.numbers || o.symbols, {
    message: "At least one character set must be enabled.",
  });
export type PasswordGeneratorOptions = z.infer<typeof passwordGeneratorOptionsSchema>;
