import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const imageCompressorTool: ToolRegistryEntry = {
  slug: "image-compressor",
  name: "Image Compressor",
  module: "image",
  description: "Compress JPG, PNG, or WebP images by adjusting quality, entirely in your browser.",
  aliases: ["compress image", "reduce image size", "jpeg compressor", "image quality reducer"],
  icon: "Minimize2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["image compressor", "compress jpg", "compress png", "reduce image file size"] },
};
