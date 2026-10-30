import { z } from "zod";

/** "auto" picks the unit from the number of digits (10 → s, 13 → ms, 16 → µs, 19 → ns). */
export const unixTimestampUnitSchema = z.enum(["auto", "seconds", "milliseconds", "microseconds", "nanoseconds"]);
export type UnixTimestampUnit = z.infer<typeof unixTimestampUnitSchema>;
export type ResolvedTimestampUnit = Exclude<UnixTimestampUnit, "auto">;
