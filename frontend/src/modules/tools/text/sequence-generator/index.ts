import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sequenceGeneratorTool: ToolRegistryEntry = {
  slug: "sequence-generator",
  name: "Sequence Generator",
  module: "text",
  description: "Generate number, letter, date and templated sequences with start, end, step, padding, shuffling and custom formats, ready to paste as a list or a comma separated line.",
  aliases: ["number range", "seq", "list of numbers", "generate dates", "letter sequence", "counting list", "series generator", "sequence of numbers"],
  icon: "ListOrdered",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sequence generator", "number range", "seq", "list of numbers", "generate dates", "letter sequence", "counting list", "series generator", "sequence of numbers"] },
};
