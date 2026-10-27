import { z } from "zod";

export const cssLengthUnitSchema = z.enum(["px", "rem", "em", "pt", "%"]);
export type CssLengthUnit = z.infer<typeof cssLengthUnitSchema>;

export const pxRemOptionsSchema = z.object({
  baseFontSize: z.number().positive().max(1000).default(16),
  defaultUnit: cssLengthUnitSchema.default("px"),
  target: z.enum(["all", "px", "rem", "em", "pt", "%"]).default("all"),
});
export type PxRemOptions = z.infer<typeof pxRemOptionsSchema>;

export const pxRemInputSchema = z.string().max(100_000);
