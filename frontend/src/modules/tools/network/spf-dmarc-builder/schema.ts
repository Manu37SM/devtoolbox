import { z } from "zod";

export const spfDmarcBuilderOptionsSchema = z.object({
  record: z.enum(["spf", "dmarc"]).default("spf"),
  spfAll: z.enum(["-all", "~all", "?all", "+all"]).default("~all"),
  dmarcPolicy: z.enum(["none", "quarantine", "reject"]).default("none"),
  dmarcPct: z.number().int().min(0).max(100).default(100),
});
export type SpfDmarcBuilderOptions = z.infer<typeof spfDmarcBuilderOptionsSchema>;

export const spfDmarcBuilderInputSchema = z.string().max(20_000);
