import { z } from "zod";

export const imageCompressorFormatSchema = z.enum(["image/jpeg", "image/webp"]);
export type ImageCompressorFormat = z.infer<typeof imageCompressorFormatSchema>;

export const imageCompressorOptionsSchema = z.object({
  // PNG is deliberately excluded — it's lossless, so a "quality" slider
  // doesn't apply to it (see DEVELOPMENT_GUIDE.md tool contract: options
  // should only expose settings that meaningfully affect output).
  format: imageCompressorFormatSchema.default("image/jpeg"),
  quality: z.number().int().min(1).max(100).default(80),
});
export type ImageCompressorOptions = z.infer<typeof imageCompressorOptionsSchema>;
