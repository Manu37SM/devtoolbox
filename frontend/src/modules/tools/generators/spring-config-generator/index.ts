import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const springConfigGeneratorTool: ToolRegistryEntry = {
  slug: "spring-config-generator",
  name: "Spring Boot application.yml Generator",
  module: "generators",
  description: "Generate Spring Boot application.yml or .properties: datasource (Oracle, PostgreSQL, MySQL, H2), JPA, Flyway, Redis, Kafka, OAuth2, actuator and logging, secrets as placeholders.",
  aliases: ["application.yml template","spring boot config generator","spring datasource oracle yaml","application-prod.yml","spring boot properties starter"],
  icon: "Settings2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["application.yml template","spring boot config generator","spring datasource oracle yaml","application-prod.yml","spring boot properties starter"] },
};
