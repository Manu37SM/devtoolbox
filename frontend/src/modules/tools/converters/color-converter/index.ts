import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const colorConverterTool: ToolRegistryEntry = {
  slug: "color-converter",
  name: "Color Converter",
  module: "converters",
  description: "Convert colors between HEX, RGB, HSL, and CMYK with a live swatch preview.",
  aliases: ["hex to rgb", "rgb to hsl", "color picker converter"],
  icon: "Palette",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["hex to rgb converter", "color converter online", "rgb to hsl"] },
};
