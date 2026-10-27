import { z } from "zod";

export const colorContrastCheckerOptionsSchema = z.object({
  includeUi: z.boolean().default(false),
});
export type ColorContrastCheckerOptions = z.infer<typeof colorContrastCheckerOptionsSchema>;

export const colorContrastCheckerInputSchema = z.string().max(1000000);
