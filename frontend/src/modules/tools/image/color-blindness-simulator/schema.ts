import { z } from "zod";

export const colorBlindnessTypeSchema = z.enum(["protanopia", "deuteranopia", "tritanopia", "achromatopsia"]);
export type ColorBlindnessType = z.infer<typeof colorBlindnessTypeSchema>;

export const colorBlindnessSimulatorOptionsSchema = z.object({
  type: colorBlindnessTypeSchema.default("deuteranopia"),
});
export type ColorBlindnessSimulatorOptions = z.infer<typeof colorBlindnessSimulatorOptionsSchema>;
