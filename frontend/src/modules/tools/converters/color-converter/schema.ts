import { z } from "zod";

export const colorConverterInputSchema = z.string().max(64);

export const colorConverterOptionsSchema = z.object({
  /** legacy = rgb(1, 2, 3) / rgba(); modern = CSS Color 4 space syntax rgb(1 2 3 / 50%). */
  syntax: z.enum(["legacy", "modern"]).default("legacy"),
  uppercaseHex: z.boolean().default(false),
  /** Decimal places for HSL/HSV/HWB/CMYK (0 = whole numbers). */
  precision: z.number().int().min(0).max(4).default(0),
});
export type ColorConverterOptions = z.infer<typeof colorConverterOptionsSchema>;
