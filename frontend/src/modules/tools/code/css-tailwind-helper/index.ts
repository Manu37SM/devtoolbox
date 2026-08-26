import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cssTailwindHelperTool: ToolRegistryEntry = {
  slug: "css-tailwind-helper",
  name: "CSS ↔ Tailwind class helper",
  module: "code",
  description: "Suggest Tailwind utility classes for raw CSS declarations, or expand Tailwind classes back to CSS.",
  aliases: ["css to tailwind", "tailwind to css", "tailwind class converter"],
  icon: "Wind",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["css to tailwind converter", "tailwind class helper", "tailwind cheat sheet"] },
};
