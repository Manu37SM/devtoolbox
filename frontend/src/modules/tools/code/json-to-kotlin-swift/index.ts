import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonToKotlinSwiftTool: ToolRegistryEntry = {
  slug: "json-to-kotlin-swift",
  name: "JSON to Kotlin / Swift Models",
  module: "code",
  description: "Generate Kotlin data classes (kotlinx.serialization, Jackson or plain) or Swift Codable structs from a JSON sample, with camelCase properties, CodingKeys or SerialName mapping and optional nulls.",
  aliases: ["json to data class","json to codable","kotlin serialization from json","swift codable generator","android json model"],
  icon: "Smartphone",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json to data class","json to codable","kotlin serialization from json","swift codable generator","android json model"] },
};
