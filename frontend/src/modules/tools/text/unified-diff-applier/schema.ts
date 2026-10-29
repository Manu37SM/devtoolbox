import { z } from "zod";

export const unifiedDiffApplierOptionsSchema = z.object({
  output: z.enum(["result", "report"]).default("result"),
  reverse: z.boolean().default(false),
  ignoreWhitespace: z.boolean().default(false),
});
export type UnifiedDiffApplierOptions = z.infer<typeof unifiedDiffApplierOptionsSchema>;
