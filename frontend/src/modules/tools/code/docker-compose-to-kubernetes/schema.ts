import { z } from "zod";

export const dockerComposeToKubernetesOptionsSchema = z.object({
  serviceType: z.enum(["ClusterIP", "NodePort", "LoadBalancer"]).default("ClusterIP"),
  namespace: z.string().default(""),
  secretsFromEnv: z.boolean().default(true),
  includeProbes: z.boolean().default(true),
});
export type DockerComposeToKubernetesOptions = z.infer<typeof dockerComposeToKubernetesOptionsSchema>;
