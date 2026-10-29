import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dockerComposeGeneratorTool: ToolRegistryEntry = {
  slug: "docker-compose-generator",
  name: "Docker Compose Stack Generator",
  module: "generators",
  description: "Generate a docker compose file for local development with Postgres, MySQL, Oracle Free, MongoDB, Redis, Kafka, RabbitMQ, Keycloak, Mailpit or LocalStack, with healthchecks and an app wired to them.",
  aliases: ["docker compose postgres redis","local dev stack compose","kafka docker compose kraft","oracle free docker compose","keycloak docker compose"],
  icon: "Blocks",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["docker compose postgres redis","local dev stack compose","kafka docker compose kraft","oracle free docker compose","keycloak docker compose"] },
};
