import { z } from "zod";

export const colorBlindnessTypeSchema = z.enum(["protanopia", "deuteranopia", "tritanopia", "achromatopsia"]);
export type ColorBlindnessType = z.infer<typeof colorBlindnessTypeSchema>;

export const colorBlindnessSimulatorOptionsSchema = z.object({
  type: colorBlindnessTypeSchema.default("deuteranopia"),
  /**
   * machado = Machado et al. (2009) in linear RGB, the model Chrome DevTools and Firefox use;
   * simple = the older gamma-space approximation this tool used before.
   */
  model: z.enum(["machado", "simple"]).default("machado"),
  /** 100 = dichromacy (-opia); lower values simulate the milder anomalous trichromacy (-omaly). */
  severity: z.number().int().min(0).max(100).default(100),
});
export type ColorBlindnessSimulatorOptions = z.infer<typeof colorBlindnessSimulatorOptionsSchema>;
