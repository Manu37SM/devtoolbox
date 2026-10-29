import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const springPropertyEnvConverterTool: ToolRegistryEntry = {
  slug: "spring-property-env-converter",
  name: "Spring Property to Environment Variable Converter",
  module: "code",
  description: "Convert Spring Boot properties or YAML keys to relaxed-binding environment variables (SPRING_DATASOURCE_URL) as dotenv, Compose, Kubernetes env or -D flags, and back.",
  aliases: ["spring boot env vars","application.yml to env","relaxed binding","spring_datasource_url","properties to docker compose environment"],
  icon: "Leaf",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["spring boot env vars","application.yml to env","relaxed binding","spring_datasource_url","properties to docker compose environment"] },
};
