import { z } from "zod";

export const cssSpecificityCalculatorOptionsSchema = z.object({
  sort: z.enum(["input", "specificity"]).default("specificity"),
});
export type CssSpecificityCalculatorOptions = z.infer<typeof cssSpecificityCalculatorOptionsSchema>;
