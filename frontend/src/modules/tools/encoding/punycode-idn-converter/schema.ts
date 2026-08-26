import { z } from "zod";

export const punycodeModeSchema = z.enum(["encode", "decode"]);
export type PunycodeMode = z.infer<typeof punycodeModeSchema>;

export const punycodeConverterInputSchema = z.string().max(2048);
