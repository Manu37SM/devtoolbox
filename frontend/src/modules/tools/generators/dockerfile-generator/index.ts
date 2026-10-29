import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dockerfileGeneratorTool: ToolRegistryEntry = {
  slug: "dockerfile-generator",
  name: "Dockerfile Generator",
  module: "generators",
  description: "Generate production Dockerfiles and .dockerignore for Spring Boot (Maven or Gradle, layered jars), Node, Next.js, Python, Go and SPAs on nginx: multi-stage, cached and non-root.",
  aliases: ["spring boot dockerfile","multi stage dockerfile","dockerfile template","distroless dockerfile","nextjs dockerfile standalone"],
  icon: "Container",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["spring boot dockerfile","multi stage dockerfile","dockerfile template","distroless dockerfile","nextjs dockerfile standalone"] },
};
