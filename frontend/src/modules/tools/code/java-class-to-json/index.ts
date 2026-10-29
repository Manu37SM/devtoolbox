import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const javaClassToJsonTool: ToolRegistryEntry = {
  slug: "java-class-to-json",
  name: "Java Class to JSON & TypeScript",
  module: "code",
  description: "Paste Java classes, records and enums to get a realistic JSON sample and TypeScript interfaces, honouring @JsonProperty, @JsonIgnore, generics, Optional, java.time types and nested classes.",
  aliases: ["pojo to json","java to typescript","dto to json sample","record to json","spring dto example payload"],
  icon: "Coffee",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["pojo to json","java to typescript","dto to json sample","record to json","spring dto example payload"] },
};
