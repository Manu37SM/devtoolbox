import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dockerComposeToKubernetesTool: ToolRegistryEntry = {
  slug: "docker-compose-to-kubernetes",
  name: "Docker Compose to Kubernetes",
  module: "code",
  description: "Convert docker-compose.yml into Kubernetes Deployments, Services, Secrets and PVCs, mapping ports, env, commands, healthchecks and limits, with notes on what does not translate.",
  aliases: ["kompose online","compose to k8s","docker compose to deployment yaml","convert compose to kubernetes","compose to helm"],
  icon: "Ship",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["kompose online","compose to k8s","docker compose to deployment yaml","convert compose to kubernetes","compose to helm"] },
};
