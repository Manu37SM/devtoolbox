import { z } from "zod";

export const slaUptimeCalculatorOptionsSchema = z.object({
  mode: z.enum(["table", "series", "parallel"]).default("table"),
  month: z.enum(["average", "30"]).default("average"),
});
export type SlaUptimeCalculatorOptions = z.infer<typeof slaUptimeCalculatorOptionsSchema>;
