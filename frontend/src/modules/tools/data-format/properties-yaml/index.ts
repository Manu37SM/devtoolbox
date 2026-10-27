import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const propertiesYamlTool: ToolRegistryEntry = {
  slug: "properties-yaml",
  name: "Properties ↔ YAML",
  module: "data-format",
  description: "Convert Spring-style application.properties to nested YAML and back, with list indices and type inference.",
  aliases: ["application.properties to yml","yml to properties","spring boot config converter","java properties to yaml"],
  icon: "FileCog",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["application.properties to yml","yml to properties","spring boot config converter","java properties to yaml"] },
};
