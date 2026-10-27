import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const yamlTomlTool: ToolRegistryEntry = {
  slug: "yaml-toml",
  name: "YAML ↔ TOML",
  module: "data-format",
  description: "Convert YAML to TOML and TOML to YAML, with a clear error when YAML nulls can't be represented.",
  aliases: ["yaml to toml","toml to yaml","pyproject converter"],
  icon: "ArrowLeftRight",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["yaml to toml","toml to yaml","pyproject converter"] },
};
