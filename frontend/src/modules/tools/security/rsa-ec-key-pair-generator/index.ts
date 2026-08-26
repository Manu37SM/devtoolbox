import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const rsaEcKeyPairGeneratorTool: ToolRegistryEntry = {
  slug: "rsa-ec-key-pair-generator",
  name: "RSA/EC Key Pair Generator",
  module: "security",
  description: "Generate an RSA or EC public/private key pair in PEM format, entirely client-side via WebCrypto.",
  aliases: ["rsa key generator", "ec key pair generator", "generate pem key pair"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["rsa key pair generator", "ec key pair generator", "generate pem keys online"] },
};
