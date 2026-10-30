import { z } from "zod";

export const imageFormatConverterTargetSchema = z.enum(["image/png", "image/jpeg", "image/webp"]);
export type ImageFormatConverterTarget = z.infer<typeof imageFormatConverterTargetSchema>;

export const imageFormatConverterOptionsSchema = z.object({
  targetFormat: imageFormatConverterTargetSchema.default("image/png"),

  quality: z.number().int().min(1).max(100).default(92),
  /** Longest side in pixels after resizing; 0 keeps the original size. */
  maxDimension: z.number().int().min(0).max(16384).default(0),
  /** Fill for transparent pixels when converting to JPEG. */
  background: z.string().default("#ffffff"),
});
export type ImageFormatConverterOptions = z.infer<typeof imageFormatConverterOptionsSchema>;

export function isQualityRelevant(targetFormat: ImageFormatConverterTarget): boolean {
  return targetFormat !== "image/png";
}
