import { z } from "zod";

export const kongConfigGeneratorOptionsSchema = z.object({
  format: z.enum(["declarative", "admin-api"]).default("declarative"),
});
export type KongConfigGeneratorOptions = z.infer<typeof kongConfigGeneratorOptionsSchema>;
