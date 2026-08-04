import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const colorPaletteGeneratorTool: ToolRegistryEntry = {
  slug: "color-palette-generator",
  name: "Color Palette Generator",
  module: "converters",
  description: "Generate a color palette from a base color using monochromatic, complementary, and other schemes.",
  aliases: ["palette generator", "color scheme generator", "hex palette"],
  icon: "Palette",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["color palette generator", "color scheme generator", "hex color palette"] },
};
