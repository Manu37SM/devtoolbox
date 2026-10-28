import { z } from "zod";

export const piiMaskerOptionsSchema = z.object({
  style: z.enum(["partial", "label", "stars"]).default("partial"),
  email: z.boolean().default(true),
  phone: z.boolean().default(true),
  card: z.boolean().default(true),
  ssn: z.boolean().default(true),
  ip: z.boolean().default(true),
  idNumbers: z.boolean().default(true),
  iban: z.boolean().default(true),
  report: z.boolean().default(false),
});
export type PiiMaskerOptions = z.infer<typeof piiMaskerOptionsSchema>;
