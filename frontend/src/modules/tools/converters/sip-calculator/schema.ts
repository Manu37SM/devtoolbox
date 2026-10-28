import { z } from "zod";

export const sipCalculatorOptionsSchema = z.object({
  mode: z.enum(["future-value", "required-sip"]).default("future-value"),
  yearlyTable: z.boolean().default(false),
});
export type SipCalculatorOptions = z.infer<typeof sipCalculatorOptionsSchema>;
