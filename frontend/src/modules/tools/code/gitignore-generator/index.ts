import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const gitignoreGeneratorTool: ToolRegistryEntry = {
  slug: "gitignore-generator",
  name: "gitignore Generator",
  module: "code",
  description: "Build a .gitignore from templates for Node, Java, Maven, Gradle, Spring, Angular, Python, IDEs, OSes and more.",
  aliases: ["gitignore","create gitignore",".gitignore templates"],
  icon: "GitBranch",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["gitignore","create gitignore",".gitignore templates"] },
};
