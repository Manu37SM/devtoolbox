import { z } from "zod";

export const colorPaletteGeneratorOptionsSchema = z.object({
  scheme: z
    .enum(["monochromatic", "complementary", "analogous", "triadic", "tetradic", "shades"])
    .default("monochromatic"),
  count: z.number().min(2).max(10).default(5),
});
export type ColorPaletteGeneratorOptions = z.infer<typeof colorPaletteGeneratorOptionsSchema>;
