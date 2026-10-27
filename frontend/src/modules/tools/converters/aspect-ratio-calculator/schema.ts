import { z } from "zod";

export const aspectRatioCalculatorOptionsSchema = z.object({
  targetWidth: z.number().min(0).default(0),
  targetHeight: z.number().min(0).default(0),
});
export type AspectRatioCalculatorOptions = z.infer<typeof aspectRatioCalculatorOptionsSchema>;

export const aspectRatioCalculatorInputSchema = z.string().max(1000000);
