import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const githubActionsGeneratorTool: ToolRegistryEntry = {
  slug: "github-actions-generator",
  name: "GitHub Actions Workflow Generator",
  module: "generators",
  description: "Generate a CI workflow for Node, Python, Java (Maven or Gradle), Go, Rust or Docker with dependency caching, version matrix, least-privilege permissions and your extra commands.",
  aliases: ["github workflow yaml","ci pipeline generator","actions ci template",".github/workflows","github actions node"],
  icon: "Workflow",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["github workflow yaml","ci pipeline generator","actions ci template",".github/workflows","github actions node"] },
};
