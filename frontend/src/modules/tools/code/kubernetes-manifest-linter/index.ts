import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const kubernetesManifestLinterTool: ToolRegistryEntry = {
  slug: "kubernetes-manifest-linter",
  name: "Kubernetes Manifest Linter",
  module: "code",
  description: "Lint Kubernetes YAML for production problems: latest tags, missing probes, resource limits, root containers, privileged mode, hostPath, secrets in env, selector mismatches and deprecated API versions.",
  aliases: ["kubernetes yaml checker","k8s best practices","kubeval alternative","deployment security check","pod security lint"],
  icon: "Boxes",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["kubernetes yaml checker","k8s best practices","kubeval alternative","deployment security check","pod security lint"] },
};
