import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const hmacGeneratorTool: ToolRegistryEntry = {
  slug: "hmac-generator",
  name: "HMAC Generator",
  module: "security",
  description: "Generate an HMAC-SHA1/256/384/512 digest of a message using a secret key.",
  aliases: ["hmac sha256", "message authentication code generator"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["hmac generator", "hmac sha256 online", "message authentication code"] },
};
