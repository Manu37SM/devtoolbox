import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const mockApiResponseGeneratorTool: ToolRegistryEntry = {
  slug: "mock-api-response-generator",
  name: "Mock REST API Response Generator",
  module: "generators",
  description: "Define a field schema and generate sample JSON records — like a fake REST API response.",
  aliases: ["mock json api", "fake api response generator", "sample json schema generator"],
  icon: "Braces",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["mock api response generator", "fake json generator", "sample rest api data"] },
};
