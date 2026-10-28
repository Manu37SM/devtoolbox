import { z } from "zod";

export const springConfigGeneratorOptionsSchema = z.object({
  format: z.enum(["yaml", "properties"]).default("yaml"),
  profile: z.enum(["default", "dev", "prod"]).default("default"),
});
export type SpringConfigGeneratorOptions = z.infer<typeof springConfigGeneratorOptionsSchema>;
