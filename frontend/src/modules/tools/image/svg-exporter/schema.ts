import { z } from "zod";

export const svgExporterOutputFormatSchema = z.enum(["image/png", "image/jpeg", "image/webp"]);
export type SvgExporterOutputFormat = z.infer<typeof svgExporterOutputFormatSchema>;

export const svgExporterOptionsSchema = z.object({
  outputFormat: svgExporterOutputFormatSchema.default("image/png"),
  width: z.number().int().min(1).max(8000).default(512),
  height: z.number().int().min(1).max(8000).default(512),
  // Only relevant for jpeg/webp (lossy); ignored for png.
  quality: z.number().int().min(1).max(100).default(92),
  // "transparent" is a sentinel, not a CSS color — PNG/WebP support alpha
  // so it's left as true transparency; JPEG doesn't, so it's resolved to
  // an opaque fallback (see resolveCanvasBackground below).
  backgroundColor: z.string().default("transparent"),
});
export type SvgExporterOptions = z.infer<typeof svgExporterOptionsSchema>;
