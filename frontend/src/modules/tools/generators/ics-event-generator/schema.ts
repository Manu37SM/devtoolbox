import { z } from "zod";

export const icsEventGeneratorOptionsSchema = z.object({
  allDay: z.boolean().default(false),
  alarm: z.enum(["none", "5m", "15m", "1h", "1d"]).default("15m"),
  repeat: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
  repeatCount: z.number().int().min(0).max(1000).default(0),
});
export type IcsEventGeneratorOptions = z.infer<typeof icsEventGeneratorOptionsSchema>;

export const icsEventGeneratorInputSchema = z.string().max(100_000);
