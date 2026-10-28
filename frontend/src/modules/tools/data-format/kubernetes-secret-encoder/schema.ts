import { z } from "zod";

export const kubernetesSecretEncoderOptionsSchema = z.object({
  mode: z.enum(["encode", "decode", "from-env"]).default("encode"),
});
export type KubernetesSecretEncoderOptions = z.infer<typeof kubernetesSecretEncoderOptionsSchema>;

export const kubernetesSecretEncoderInputSchema = z.string().max(1_000_000);
