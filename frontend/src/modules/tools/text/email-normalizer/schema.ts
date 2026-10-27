import { z } from "zod";

export const emailNormalizerOptionsSchema = z.object({
  stripPlus: z.enum(["none", "gmail", "all"]).default("gmail"),
  lowercase: z.boolean().default(true),
  gmailDots: z.boolean().default(true),
  unifyGmailDomain: z.boolean().default(true),
  dedupe: z.boolean().default(true),
});
export type EmailNormalizerOptions = z.infer<typeof emailNormalizerOptionsSchema>;

export const emailNormalizerInputSchema = z.string().max(1000000);
