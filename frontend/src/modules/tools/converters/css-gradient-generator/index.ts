import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cssGradientGeneratorTool: ToolRegistryEntry = {
  slug: "css-gradient-generator",
  name: "CSS Gradient Generator",
  module: "converters",
  description: "Design linear, radial, and conic CSS gradients with a live preview and copyable CSS.",
  aliases: ["gradient maker", "linear gradient generator", "css gradient background"],
  icon: "Blend",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["css gradient generator", "linear gradient css", "radial gradient css", "gradient maker"] },
};
