import { z } from "zod";

export const numberBaseSchema = z.union([
  z.literal(2),
  z.literal(8),
  z.literal(10),
  z.literal(16),
]);
export type NumberBase = z.infer<typeof numberBaseSchema>;

export const numberBaseConverterInputSchema = z.string().max(256);

export const numberBaseOptionsSchema = z.object({
  /** Fixed width for two's complement: negative numbers are shown as their bit pattern, and input is also read as signed. */
  bitWidth: z.enum(["none", "8", "16", "32", "64", "128"]).default("none"),
  /** Group digits: binary in nibbles, hex in bytes, octal in threes, decimal in thousands. */
  grouping: z.boolean().default(false),
  uppercase: z.boolean().default(false),
  /** Add 0b / 0o / 0x prefixes to the results. */
  prefixes: z.boolean().default(false),
});
export type NumberBaseOptions = z.infer<typeof numberBaseOptionsSchema>;
