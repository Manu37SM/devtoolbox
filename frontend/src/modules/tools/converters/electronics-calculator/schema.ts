import { z } from "zod";

export const ELECTRONICS_OPS = ["ohms-law", "led-resistor", "voltage-divider", "series-parallel", "rc-filter", "resistor-color-code", "timer-555-astable"] as const;

export const electronicsCalculatorOptionsSchema = z.object({
  operation: z.enum(ELECTRONICS_OPS).default("ohms-law"),
});
export type ElectronicsCalculatorOptions = z.infer<typeof electronicsCalculatorOptionsSchema>;
