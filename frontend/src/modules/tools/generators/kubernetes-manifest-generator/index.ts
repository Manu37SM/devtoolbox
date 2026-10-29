import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const kubernetesManifestGeneratorTool: ToolRegistryEntry = {
  slug: "kubernetes-manifest-generator",
  name: "Kubernetes Manifest Generator",
  module: "generators",
  description: "Generate a hardened Kubernetes Deployment with Service, Ingress, HPA and PodDisruptionBudget: non-root, read-only filesystem, probes, resources and secrets, with a Spring Boot preset.",
  aliases: ["kubernetes deployment yaml generator","k8s manifest template","spring boot kubernetes yaml","deployment service ingress yaml","hpa yaml generator"],
  icon: "Component",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["kubernetes deployment yaml generator","k8s manifest template","spring boot kubernetes yaml","deployment service ingress yaml","hpa yaml generator"] },
};
