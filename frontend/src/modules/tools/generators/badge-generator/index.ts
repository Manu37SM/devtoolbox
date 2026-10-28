import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const badgeGeneratorTool: ToolRegistryEntry = {
  slug: "badge-generator",
  name: "README Badge Generator (shields.io)",
  module: "generators",
  description: "Generate README badges with correct shields.io escaping: custom static badges, GitHub release, license, stars and CI status, npm, PyPI and Maven Central sets, as Markdown, HTML, reStructuredText or plain URLs.",
  aliases: ["shields.io badge","readme badges","github actions badge","npm version badge","markdown badge generator"],
  icon: "BadgeCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["shields.io badge","readme badges","github actions badge","npm version badge","markdown badge generator"] },
};
