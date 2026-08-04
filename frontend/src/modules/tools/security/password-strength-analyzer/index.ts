import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const passwordStrengthAnalyzerTool: ToolRegistryEntry = {
  slug: "password-strength-analyzer",
  name: "Password Strength Analyzer",
  module: "security",
  description: "Analyze a password's strength locally with entropy, crack-time, and feedback.",
  aliases: ["password checker", "password entropy calculator"],
  icon: "ShieldCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["password strength checker", "password entropy calculator", "how strong is my password"] },
};
