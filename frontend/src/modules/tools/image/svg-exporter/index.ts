import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const svgExporterTool: ToolRegistryEntry = {
  slug: "svg-exporter",
  name: "SVG ↔ PNG/JPEG/WebP Exporter",
  module: "image",
  description: "Rasterize SVG markup or an .svg file to a PNG, JPEG, or WebP at any size, entirely in your browser.",
  aliases: ["svg to png", "svg to jpg", "svg to webp", "svg rasterizer", "svg converter"],
  icon: "Image",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["svg to png converter", "svg to jpg", "svg to webp", "rasterize svg online"] },
};
