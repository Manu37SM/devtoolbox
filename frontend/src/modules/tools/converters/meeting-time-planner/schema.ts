import { z } from "zod";

export const meetingTimePlannerOptionsSchema = z.object({
  /** date in the first participant's time zone, YYYY-MM-DD */
  date: z.string().default(""),
  meetingMinutes: z.number().int().min(5).max(480).default(60),
  stepMinutes: z.enum(["15", "30", "60"]).default("30"),
  /** default working hours "9-18" (overridden per line) */
  hours: z.string().default("9-18"),
  weekend: z.enum(["sat-sun", "fri-sat", "fri", "none"]).default("sat-sun"),
  view: z.enum(["windows", "grid"]).default("windows"),
  clock: z.enum(["24", "12"]).default("24"),
  /** also list the best options where only some people are in hours */
  compromises: z.boolean().default(true),
});
export type MeetingTimePlannerOptions = z.infer<typeof meetingTimePlannerOptionsSchema>;
