import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const faviconGeneratorTool: ToolRegistryEntry = {
  slug: "favicon-generator",
  name: "Favicon Generator",
  module: "image",
  description: "Generate a full favicon and PWA icon size bundle from a source image, entirely in your browser.",
  aliases: ["favicon maker", "apple touch icon generator", "pwa icon generator"],
  icon: "Image",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["favicon generator", "favicon.ico maker", "apple touch icon generator", "pwa icon generator"] },
};
