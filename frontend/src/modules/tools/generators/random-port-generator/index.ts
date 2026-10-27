import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const randomPortGeneratorTool: ToolRegistryEntry = {
  slug: "random-port-generator",
  name: "Random Port Generator",
  module: "generators",
  description: "Pick random free-looking TCP/UDP ports for dev servers, avoiding commonly used ones like 3000, 5432 and 8080.",
  aliases: ["random port","free port picker","dev server port"],
  icon: "Dices",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["random port","free port picker","dev server port"] },
};
