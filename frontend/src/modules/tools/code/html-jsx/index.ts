import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const htmlJsxTool: ToolRegistryEntry = {
  slug: "html-jsx",
  name: "HTML to JSX Converter",
  module: "code",
  description: "Convert pasted HTML markup into JSX syntax for React components.",
  aliases: ["html to jsx", "jsx converter", "html to react"],
  icon: "FileCode",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["html to jsx converter", "html to react", "convert html to jsx online"] },
};
