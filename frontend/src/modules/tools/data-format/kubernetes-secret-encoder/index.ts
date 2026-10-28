import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const kubernetesSecretEncoderTool: ToolRegistryEntry = {
  slug: "kubernetes-secret-encoder",
  name: "Kubernetes Secret Encoder / Decoder",
  module: "data-format",
  description: "Base64-encode stringData into a Secret's data block, decode data back to readable values, or build a Secret manifest from a .env file. Nothing leaves your browser.",
  aliases: ["k8s secret base64","kubectl secret yaml","decode kubernetes secret","env to secret","stringData to data"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["k8s secret base64","kubectl secret yaml","decode kubernetes secret","env to secret","stringData to data"] },
};
