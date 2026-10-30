import { z } from "zod";

export const cronBuilderInputSchema = z.string().max(200);

export const cronBuilderOptionsSchema = z.object({
  nextRunCount: z.number().int().min(1).max(20).default(5),
  /** unix: 5 fields (crontab, Kubernetes, GitHub Actions); spring: 6 fields with seconds; quartz: 6-7 fields. */
  dialect: z.enum(["unix", "spring", "quartz"]).default("unix"),
  /** IANA zone for the next-run list; empty means the browser's zone. */
  timezone: z.string().max(64).default(""),
});
export type CronBuilderOptions = z.infer<typeof cronBuilderOptionsSchema>;
