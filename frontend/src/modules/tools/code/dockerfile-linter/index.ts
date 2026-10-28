import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dockerfileLinterTool: ToolRegistryEntry = {
  slug: "dockerfile-linter",
  name: "Dockerfile Linter",
  module: "code",
  description: "Lint a Dockerfile for common mistakes: latest tags, missing USER, apt-get without cleanup or -y, ADD instead of COPY, shell-form CMD, missing HEALTHCHECK, secrets in ENV and more.",
  aliases: ["hadolint online","dockerfile best practices","dockerfile checker","docker security lint","dockerfile validator"],
  icon: "Container",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["hadolint online","dockerfile best practices","dockerfile checker","docker security lint","dockerfile validator"] },
};
