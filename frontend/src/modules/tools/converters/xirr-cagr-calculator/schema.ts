import { z } from "zod";

export const xirrCagrCalculatorOptionsSchema = z.object({
  mode: z.enum(["xirr", "cagr"]).default("xirr"),
});
export type XirrCagrCalculatorOptions = z.infer<typeof xirrCagrCalculatorOptionsSchema>;
