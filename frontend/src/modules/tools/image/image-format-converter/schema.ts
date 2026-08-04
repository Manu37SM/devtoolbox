import { z } from "zod";

export const imageFormatConverterTargetSchema = z.enum(["image/png", "image/jpeg", "image/webp"]);
export type ImageFormatConverterTarget = z.infer<typeof imageFormatConverterTargetSchema>;

export const imageFormatConverterOptionsSchema = z.object({
  targetFormat: imageFormatConverterTargetSchema.default("image/png"),
  // Only relevant/shown in the UI when targetFormat is jpeg/webp (PNG is
  // lossless) — still always present in the options object so transform.ts
  // stays a pure function of its full options, per the tool contract.
  quality: z.number().int().min(1).max(100).default(92),
});
export type ImageFormatConverterOptions = z.infer<typeof imageFormatConverterOptionsSchema>;

/** Whether the quality slider is meaningful for a given target format —
 * PNG is lossless. Pure, so both transform.ts and ToolView.tsx can share
 * the same rule instead of re-deriving it. */
export function isQualityRelevant(targetFormat: ImageFormatConverterTarget): boolean {
  return targetFormat !== "image/png";
}
