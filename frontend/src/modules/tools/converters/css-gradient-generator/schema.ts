import { z } from "zod";

export const gradientStopSchema = z.object({
  color: z.string(),
  position: z.number().min(0).max(100),
});
export type GradientStop = z.infer<typeof gradientStopSchema>;

export const cssGradientTypeSchema = z.enum(["linear", "radial", "conic"]);
export type CssGradientType = z.infer<typeof cssGradientTypeSchema>;

export const cssGradientGeneratorOptionsSchema = z.object({
  type: cssGradientTypeSchema.default("linear"),
  /** Linear-only: angle in degrees, CSS `linear-gradient(<angle>deg, ...)`
   * convention (0deg = bottom-to-top, 90deg = left-to-right). */
  angle: z.number().min(0).max(360).default(90),
  stops: z
    .array(gradientStopSchema)
    .min(2)
    .default([
      { color: "#6366f1", position: 0 },
      { color: "#ec4899", position: 100 },
    ]),
});
export type CssGradientGeneratorOptions = z.infer<typeof cssGradientGeneratorOptionsSchema>;
