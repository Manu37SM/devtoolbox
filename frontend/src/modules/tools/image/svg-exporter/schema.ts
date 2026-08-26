import { z } from "zod";

export const svgExporterOutputFormatSchema = z.enum(["image/png", "image/jpeg", "image/webp"]);
export type SvgExporterOutputFormat = z.infer<typeof svgExporterOutputFormatSchema>;

export const svgExporterOptionsSchema = z.object({
  outputFormat: svgExporterOutputFormatSchema.default("image/png"),
  width: z.number().int().min(1).max(8000).default(512),
  height: z.number().int().min(1).max(8000).default(512),

  quality: z.number().int().min(1).max(100).default(92),

  backgroundColor: z.string().default("transparent"),
});
export type SvgExporterOptions = z.infer<typeof svgExporterOptionsSchema>;
