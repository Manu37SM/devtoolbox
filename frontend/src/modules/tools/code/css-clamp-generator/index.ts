import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cssClampGeneratorTool: ToolRegistryEntry = {
  slug: "css-clamp-generator",
  name: "CSS clamp() Generator",
  module: "code",
  description: "Generate fluid typography and spacing with CSS clamp(), from min/max sizes across a viewport range.",
  aliases: ["fluid typography","responsive font size","css clamp calculator","clamp()"],
  icon: "Maximize2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["fluid typography","responsive font size","css clamp calculator","clamp()"] },
};
