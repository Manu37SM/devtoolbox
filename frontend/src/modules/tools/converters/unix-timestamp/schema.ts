import { z } from "zod";

export const unixTimestampUnitSchema = z.enum(["seconds", "milliseconds"]);
export type UnixTimestampUnit = z.infer<typeof unixTimestampUnitSchema>;
