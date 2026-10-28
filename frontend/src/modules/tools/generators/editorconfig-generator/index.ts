import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const editorconfigGeneratorTool: ToolRegistryEntry = {
  slug: "editorconfig-generator",
  name: ".editorconfig Generator",
  module: "generators",
  description: "Build an .editorconfig with indent style and size, line endings, charset, trailing whitespace rules and sensible per-language overrides for Java, Go, Python, Makefiles and more.",
  aliases: ["editorconfig","indent style config","editor settings file","line endings config","code style file"],
  icon: "FileCode",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["editorconfig","indent style config","editor settings file","line endings config","code style file"] },
};
