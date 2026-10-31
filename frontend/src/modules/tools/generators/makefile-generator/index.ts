import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const makefileGeneratorTool: ToolRegistryEntry = {
  slug: "makefile-generator",
  name: "Makefile Generator",
  module: "generators",
  description: "Generate a Makefile with help target, phony targets, variables, build, test, lint and clean rules for Node, Go, Python, Java, Docker or C, with tab-safe recipes.",
  aliases: ["makefile", "make help target", "phony targets", "gnu make template", "makefile example"],
  icon: "Hammer",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["makefile generator", "makefile", "make help target", "phony targets", "gnu make template", "makefile example"] },
};
