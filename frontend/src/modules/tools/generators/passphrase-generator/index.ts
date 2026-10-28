import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const passphraseGeneratorTool: ToolRegistryEntry = {
  slug: "passphrase-generator",
  name: "Passphrase Generator (Diceware)",
  module: "generators",
  description: "Generate memorable random passphrases from the EFF large wordlist (7,776 words) with an entropy estimate. Runs in your browser with the Web Crypto RNG.",
  aliases: ["diceware","random passphrase","eff wordlist","xkcd password","memorable password"],
  icon: "Dices",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["diceware","random passphrase","eff wordlist","xkcd password","memorable password"] },
};
