import { z } from "zod";

export const coordinateConverterOptionsSchema = z.object({
  precision: z.number().int().min(0).max(10).default(5),
  geohashLength: z.number().int().min(1).max(12).default(9),
  showUtm: z.boolean().default(true),
});
export type CoordinateConverterOptions = z.infer<typeof coordinateConverterOptionsSchema>;

export const coordinateConverterInputSchema = z.string().max(100_000);
