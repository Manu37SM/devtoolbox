import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const emailNormalizerTool: ToolRegistryEntry = {
  slug: "email-normalizer",
  name: "Email Normalizer",
  module: "text",
  description: "Normalize and dedupe email lists: lowercase, strip +tags, remove Gmail dots, flag invalid addresses.",
  aliases: ["dedupe emails","gmail dot remover","email cleaner","strip plus addressing"],
  icon: "AtSign",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["dedupe emails","gmail dot remover","email cleaner","strip plus addressing"] },
};
