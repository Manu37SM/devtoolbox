import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const springConfigGeneratorTool: ToolRegistryEntry = {
  slug: "spring-config-generator",
  name: "Spring Boot application.yml Generator",
  module: "generators",
  description: "Generate application.yml or application.properties for Spring Boot: datasource (Oracle, PostgreSQL, MySQL, H2), JPA, Flyway, Redis, Kafka, OAuth2 resource server, actuator and logging, with secrets as placeholders.",
  aliases: ["application.yml template","spring boot config generator","spring datasource oracle yaml","application-prod.yml","spring boot properties starter"],
  icon: "Settings2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["application.yml template","spring boot config generator","spring datasource oracle yaml","application-prod.yml","spring boot properties starter"] },
};
