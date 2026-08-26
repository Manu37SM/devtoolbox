import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const placeholderImageGeneratorTool: ToolRegistryEntry = {
  slug: "placeholder-image-generator",
  name: "Placeholder/SVG Mockup Image Generator",
  module: "image",
  description: "Generate a placeholder SVG image at any size with custom colors and label text.",
  aliases: ["placeholder image", "mockup image generator", "dummy image svg"],
  icon: "ImagePlus",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["placeholder image generator", "svg mockup image", "dummy image placeholder"] },
};
