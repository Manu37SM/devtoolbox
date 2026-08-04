import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const svgOptimizerTool: ToolRegistryEntry = {
  slug: "svg-optimizer",
  name: "SVG Optimizer/Minifier",
  module: "image",
  description: "Optimize and minify SVG markup with SVGO, entirely in your browser.",
  aliases: ["svg minifier", "svgo online", "svg compressor"],
  icon: "Shrink",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["svg optimizer", "svg minifier", "svgo online", "compress svg"] },
};
