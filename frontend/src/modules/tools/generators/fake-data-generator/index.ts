import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const fakeDataGeneratorTool: ToolRegistryEntry = {
  slug: "fake-data-generator",
  name: "Fake/Mock Data Generator",
  module: "generators",
  description: "Generate fake test data — people, addresses, companies, products — as seedable JSON records.",
  aliases: ["mock data generator", "test data generator", "faker data"],
  icon: "UserSquare2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["fake data generator online", "mock data generator", "test data generator json"] },
};
