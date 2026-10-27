import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const luhnValidatorTool: ToolRegistryEntry = {
  slug: "luhn-validator",
  name: "Luhn Checker & Test Number Generator",
  module: "security",
  description: "Validate card-style numbers with the Luhn algorithm and detect the network, or generate random Luhn-valid test numbers. Runs locally; digits are masked by default.",
  aliases: ["luhn algorithm","credit card validator","card number check","test card generator","imei checker"],
  icon: "CreditCard",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["luhn algorithm","credit card validator","card number check","test card generator","imei checker"] },
};
