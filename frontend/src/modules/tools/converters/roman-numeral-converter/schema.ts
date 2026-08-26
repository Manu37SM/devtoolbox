import { z } from "zod";

export const romanNumeralModeSchema = z.enum(["to-roman", "from-roman"]);
export type RomanNumeralMode = z.infer<typeof romanNumeralModeSchema>;

export const romanNumeralConverterInputSchema = z.string().max(64);
