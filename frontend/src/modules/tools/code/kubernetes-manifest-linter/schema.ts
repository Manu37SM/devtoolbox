import { z } from "zod";

export const kubernetesManifestLinterOptionsSchema = z.object({
  minSeverity: z.enum(["info", "warning", "error"]).default("info"),
  securityChecks: z.boolean().default(true),
  reliabilityChecks: z.boolean().default(true),
});
export type KubernetesManifestLinterOptions = z.infer<typeof kubernetesManifestLinterOptionsSchema>;
