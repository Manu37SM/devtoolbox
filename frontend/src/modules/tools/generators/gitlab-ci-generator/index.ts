import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const gitlabCiGeneratorTool: ToolRegistryEntry = {
  slug: "gitlab-ci-generator",
  name: "GitLab CI Generator",
  module: "generators",
  description: "Generate a .gitlab-ci.yml for Node, Java Maven or Gradle, Python or Go with stages, caching, artifacts, services, rules and optional Docker build and deploy jobs.",
  aliases: ["gitlab pipeline", "gitlab-ci.yml", "ci cd yaml", "gitlab runner config", "gitlab cache artifacts"],
  icon: "GitBranch",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["gitlab ci generator", "gitlab pipeline", "gitlab-ci.yml", "ci cd yaml", "gitlab runner config", "gitlab cache artifacts"] },
};
