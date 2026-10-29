import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const logbackConfigGeneratorTool: ToolRegistryEntry = {
  slug: "logback-config-generator",
  name: "Logback & Log4j2 Config Generator",
  module: "generators",
  description: "Generate logback-spring.xml, log4j2-spring.xml or Spring Boot logging properties with JSON (ECS or Logstash) or pattern output, rolling files, async appenders, levels and profile splits.",
  aliases: ["logback-spring.xml example","log4j2 rolling file config","spring boot json logging","logstash logback encoder","structured logging spring boot"],
  icon: "Logs",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["logback-spring.xml example","log4j2 rolling file config","spring boot json logging","logstash logback encoder","structured logging spring boot"] },
};
