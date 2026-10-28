import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const yamlAnchorExpanderTool: ToolRegistryEntry = {
  slug: "yaml-anchor-expander",
  name: "YAML Anchor & Alias Expander",
  module: "data-format",
  description: "Resolve YAML anchors, aliases and merge keys (<<) into fully expanded YAML or JSON, so GitLab CI, Docker Compose and Kubernetes configs can be read without chasing references.",
  aliases: ["expand yaml anchors","yaml merge key resolver","resolve yaml aliases","gitlab ci anchors expanded","yaml << merge"],
  icon: "Anchor",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["expand yaml anchors","yaml merge key resolver","resolve yaml aliases","gitlab ci anchors expanded","yaml << merge"] },
};
