import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const boxShadowBorderRadiusGeneratorTool: ToolRegistryEntry = {
  slug: "box-shadow-border-radius-generator",
  name: "Box Shadow / Border Radius Generator",
  module: "converters",
  description: "Design a CSS box-shadow and border-radius with a live preview and copyable CSS.",
  aliases: ["box shadow generator", "border radius generator", "css shadow maker"],
  icon: "Square",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["box shadow generator", "css box shadow", "border radius generator", "css shadow css"],
  },
};
