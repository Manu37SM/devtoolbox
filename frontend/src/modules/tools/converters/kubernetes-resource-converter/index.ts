import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const kubernetesResourceConverterTool: ToolRegistryEntry = {
  slug: "kubernetes-resource-converter",
  name: "Kubernetes CPU & Memory Converter",
  module: "converters",
  description: "Convert Kubernetes resource quantities: millicores to cores, Mi/Gi/Ki and decimal M/G units to bytes, MiB and GiB. Paste requests and limits straight from a manifest.",
  aliases: ["millicores","k8s resource units","mi vs mb kubernetes","cpu 500m","resource requests limits"],
  icon: "Boxes",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["millicores","k8s resource units","mi vs mb kubernetes","cpu 500m","resource requests limits"] },
};
