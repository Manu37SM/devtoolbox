import { z } from "zod";

export const envFileCompareOptionsSchema = z.object({
  showValues: z.boolean().default(false),
  showSame: z.boolean().default(false),
});
export type EnvFileCompareOptions = z.infer<typeof envFileCompareOptionsSchema>;

export const envFileCompareInputSchema = z.string().max(1_000_000);
