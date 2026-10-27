import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonToJavaTool: ToolRegistryEntry = {
  slug: "json-to-java",
  name: "JSON to Java Classes",
  module: "data-format",
  description: "Generate Java POJOs, Lombok @Data classes or records from a JSON sample, with Jackson @JsonProperty where names differ.",
  aliases: ["json to pojo","json to java class","json to lombok","json to record"],
  icon: "Coffee",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json to pojo","json to java class","json to lombok","json to record"] },
};
