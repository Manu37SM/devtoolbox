import { z } from "zod";

export const regexFlagsSchema = z.object({
  global: z.boolean().default(true),
  ignoreCase: z.boolean().default(false),
  multiline: z.boolean().default(false),
  dotAll: z.boolean().default(false),
  unicode: z.boolean().default(false),
});
export type RegexFlags = z.infer<typeof regexFlagsSchema>;

export const regexTesterInputSchema = z.string().max(500_000);
