import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const passwordGeneratorTool: ToolRegistryEntry = {
  slug: "password-generator",
  name: "Password Generator",
  module: "security",
  description: "Generate strong random passwords with a live entropy estimate, entirely client-side.",
  aliases: ["random password generator", "strong password generator"],
  icon: "Lock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["password generator", "random password generator online"] },
};
