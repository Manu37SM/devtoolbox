import { z } from "zod";

export const javaClassToJsonOptionsSchema = z.object({
  output: z.enum(["json", "typescript", "both"]).default("both"),
  naming: z.enum(["as-is", "snake"]).default("as-is"),
});
export type JavaClassToJsonOptions = z.infer<typeof javaClassToJsonOptionsSchema>;
