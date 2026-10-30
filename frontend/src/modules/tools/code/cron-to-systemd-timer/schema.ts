import { z } from "zod";

export const cronToSystemdTimerOptionsSchema = z.object({
  /** Name used for the .timer and .service files. */
  unitName: z.string().max(60).default("backup"),
  /** What the service runs (ExecStart). */
  command: z.string().max(500).default("/usr/local/bin/backup.sh"),
  description: z.string().max(200).default(""),
  user: z.string().max(40).default(""),
  /** Catch up on runs missed while the machine was off. */
  persistent: z.boolean().default(true),
  /** RandomizedDelaySec in seconds (0 = off), spreads load across many machines. */
  randomizedDelaySec: z.number().int().min(0).max(86_400).default(0),
  /** Timezone appended to OnCalendar, e.g. "UTC" or "Asia/Kolkata". Empty = system local. */
  timezone: z.string().max(60).default(""),
  output: z.enum(["units", "oncalendar"]).default("units"),
});
export type CronToSystemdTimerOptions = z.infer<typeof cronToSystemdTimerOptionsSchema>;

export const cronToSystemdTimerInputSchema = z.string().max(2_000);
