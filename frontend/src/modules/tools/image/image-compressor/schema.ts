import { z } from "zod";

export const imageCompressorFormatSchema = z.enum(["image/jpeg", "image/webp"]);
export type ImageCompressorFormat = z.infer<typeof imageCompressorFormatSchema>;

export const imageCompressorOptionsSchema = z.object({

  format: imageCompressorFormatSchema.default("image/jpeg"),
  quality: z.number().int().min(1).max(100).default(80),
  /** Longest side in pixels after resizing; 0 keeps the original size. */
  maxDimension: z.number().int().min(0).max(16384).default(0),
  /** Pick the best quality that fits this size in KB (overrides quality); 0 = off. */
  targetSizeKb: z.number().int().min(0).max(100_000).default(0),
  /** Fill for transparent pixels when saving JPEG (which has no alpha channel). */
  background: z.string().default("#ffffff"),
});
export type ImageCompressorOptions = z.infer<typeof imageCompressorOptionsSchema>;
