import { z } from "zod";

export const weekNumberCalculatorOptionsSchema = z.object({
  /** How weeks are numbered. "custom" uses firstWeekday and minDays. */
  system: z.enum(["iso", "us", "unix-sunday", "unix-monday", "custom"]).default("iso"),
  /** custom: first day of the week, 0 = Sunday … 6 = Saturday. */
  firstWeekday: z.number().int().min(0).max(6).default(1),
  /** custom: days of the new year a week needs for it to count as week 1 (1–7; ISO uses 4). */
  minDays: z.number().int().min(1).max(7).default(4),
  /** dates: facts about each date. weeks: every week of a year. */
  mode: z.enum(["dates", "weeks"]).default("dates"),
  format: z.enum(["text", "csv", "json"]).default("text"),
});
export type WeekNumberCalculatorOptions = z.infer<typeof weekNumberCalculatorOptionsSchema>;

export const weekNumberCalculatorInputSchema = z.string().max(100_000);
