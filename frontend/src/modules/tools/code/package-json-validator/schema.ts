import { z } from "zod";

export const packageJsonValidatorOptionsSchema = z.object({
  minSeverity: z.enum(["info", "warning", "error"]).default("info"),
  forPublishing: z.boolean().default(false),
});
export type PackageJsonValidatorOptions = z.infer<typeof packageJsonValidatorOptionsSchema>;
