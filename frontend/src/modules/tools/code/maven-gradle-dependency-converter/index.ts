import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const mavenGradleDependencyConverterTool: ToolRegistryEntry = {
  slug: "maven-gradle-dependency-converter",
  name: "Maven / Gradle Dependency Converter",
  module: "code",
  description: "Convert dependency blocks between Maven pom.xml and Gradle (Groovy or Kotlin DSL): scopes, classifiers, exclusions and BOM imports map to implementation, runtimeOnly, compileOnly and platform().",
  aliases: ["pom to gradle","gradle to maven","maven dependency to gradle","build.gradle.kts dependencies","convert pom dependencies"],
  icon: "Package",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["pom to gradle","gradle to maven","maven dependency to gradle","build.gradle.kts dependencies","convert pom dependencies"] },
};
