import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dockerRunToComposeTool: ToolRegistryEntry = {
  slug: "docker-run-to-compose",
  name: "Docker Run to Compose",
  module: "code",
  description: "Convert a docker run command into a docker-compose.yml service, listing any flags that have no Compose equivalent.",
  aliases: ["docker run to docker-compose","docker command to compose","composerize"],
  icon: "Container",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["docker run to docker-compose","docker command to compose","composerize"] },
};
