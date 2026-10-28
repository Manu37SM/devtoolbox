import { z } from "zod";

export const fractionDecimalConverterOptionsSchema = z.object({
  maxDenominator: z.enum(["16", "100", "1000", "10000", "1000000"]).default("1000"),
  precision: z.number().int().min(1).max(30).default(10),
  mixed: z.boolean().default(true),
});
export type FractionDecimalConverterOptions = z.infer<typeof fractionDecimalConverterOptionsSchema>;
