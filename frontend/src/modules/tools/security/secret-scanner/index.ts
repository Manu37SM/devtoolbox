import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const secretScannerTool: ToolRegistryEntry = {
  slug: "secret-scanner",
  name: "Secret & API Key Scanner",
  module: "security",
  description: "Scan pasted code, configs or logs for leaked credentials: AWS, GitHub, GitLab, Slack, Stripe, Google, SendGrid, npm, OpenAI and Anthropic keys, JWTs, private keys and passwords in URLs. Runs locally and masks matches.",
  aliases: ["api key leak detector","find secrets in code","gitleaks online","aws key scanner","credential scanner"],
  icon: "ShieldAlert",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["api key leak detector","find secrets in code","gitleaks online","aws key scanner","credential scanner"] },
};
