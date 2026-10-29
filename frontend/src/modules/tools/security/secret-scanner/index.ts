import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const secretScannerTool: ToolRegistryEntry = {
  slug: "secret-scanner",
  name: "Secret & API Key Scanner",
  module: "security",
  description: "Scan pasted code, configs or logs for leaked credentials: AWS, GitHub, Slack, Stripe, Google, npm, OpenAI and Anthropic keys, JWTs, private keys and URL passwords. Runs locally.",
  aliases: ["api key leak detector","find secrets in code","gitleaks online","aws key scanner","credential scanner"],
  icon: "ShieldAlert",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["api key leak detector","find secrets in code","gitleaks online","aws key scanner","credential scanner"] },
};
