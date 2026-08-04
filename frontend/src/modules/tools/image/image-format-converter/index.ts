import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const imageFormatConverterTool: ToolRegistryEntry = {
  slug: "image-format-converter",
  name: "Image Format Converter",
  module: "image",
  description: "Convert images between PNG, JPEG, and WebP entirely in your browser.",
  aliases: ["png to jpg", "jpg to png", "webp converter", "convert image format"],
  icon: "RefreshCw",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["image format converter", "png to jpg", "jpg to webp", "convert image online"] },
};
