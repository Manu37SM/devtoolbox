import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const textCleanerTool: ToolRegistryEntry = {
  slug: "text-cleaner",
  name: "Text Cleaner",
  module: "text",
  description: "Clean pasted text: trim, collapse spaces, drop blank lines, strip HTML, remove accents and zero-width characters.",
  aliases: ["remove extra spaces","strip html tags","remove empty lines","remove accents","clean pasted text"],
  icon: "Eraser",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["remove extra spaces","strip html tags","remove empty lines","remove accents","clean pasted text"] },
};
