import { z } from "zod";

export const dockerComposeGeneratorOptionsSchema = z.object({
  healthchecks: z.boolean().default(true),
  includeApp: z.boolean().default(true),
  envDefaults: z.boolean().default(true),
});
export type DockerComposeGeneratorOptions = z.infer<typeof dockerComposeGeneratorOptionsSchema>;
