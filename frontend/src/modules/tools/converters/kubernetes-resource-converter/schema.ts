import { z } from "zod";

export const kubernetesResourceConverterOptionsSchema = z.object({
  kind: z.enum(["auto", "cpu", "memory"]).default("auto"),
});
export type KubernetesResourceConverterOptions = z.infer<typeof kubernetesResourceConverterOptionsSchema>;

export const kubernetesResourceConverterInputSchema = z.string().max(100_000);
