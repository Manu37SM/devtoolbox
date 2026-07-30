import { z } from "zod";

export const cronBuilderInputSchema = z.string().max(200);

export const cronBuilderOptionsSchema = z.object({
  nextRunCount: z.number().int().min(1).max(20).default(5),
});
export type CronBuilderOptions = z.infer<typeof cronBuilderOptionsSchema>;
