import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const loremIpsumTool: ToolRegistryEntry = {
  slug: "lorem-ipsum",
  name: "Lorem Ipsum Generator",
  module: "text",
  description: "Generate placeholder Lorem Ipsum text by words, sentences, paragraphs, or list items.",
  aliases: ["lorem ipsum", "placeholder text generator", "dummy text generator"],
  icon: "AlignLeft",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["lorem ipsum generator", "placeholder text generator"] },
};
