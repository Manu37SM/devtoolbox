import { z } from "zod";

export const kubernetesManifestGeneratorOptionsSchema = z.object({
  springBoot: z.boolean().default(true),
  service: z.boolean().default(true),
  ingress: z.boolean().default(true),
  hpa: z.boolean().default(true),
  pdb: z.boolean().default(true),
});
export type KubernetesManifestGeneratorOptions = z.infer<typeof kubernetesManifestGeneratorOptionsSchema>;
