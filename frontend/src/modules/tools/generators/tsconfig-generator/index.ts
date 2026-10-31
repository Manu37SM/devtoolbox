import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const tsconfigGeneratorTool: ToolRegistryEntry = {
  slug: "tsconfig-generator",
  name: "tsconfig.json Generator",
  module: "generators",
  description: "Build a tsconfig.json from presets for Node, browser, library, React, Next.js or Vite with strictness, module, target, path alias and include options explained inline.",
  aliases: ["tsconfig", "typescript config", "tsc init", "compilerOptions", "strict mode config", "tsconfig paths"],
  icon: "FileCog",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["tsconfig.json generator", "tsconfig", "typescript config", "tsc init", "compilerOptions", "strict mode config", "tsconfig paths"] },
};
