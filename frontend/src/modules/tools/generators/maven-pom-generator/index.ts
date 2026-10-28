import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const mavenPomGeneratorTool: ToolRegistryEntry = {
  slug: "maven-pom-generator",
  name: "Maven pom.xml Generator",
  module: "generators",
  description: "Generate a pom.xml for a Spring Boot service, plain JAR or library from shortcuts like web, data-jpa, oracle, security and lombok, with the Boot parent, Java version, test starter and Lombok-safe packaging.",
  aliases: ["spring boot pom","pom.xml template","maven project generator","spring initializr pom","maven dependencies shortcuts"],
  icon: "FileCodeCorner",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["spring boot pom","pom.xml template","maven project generator","spring initializr pom","maven dependencies shortcuts"] },
};
