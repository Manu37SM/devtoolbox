import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const semverToolTool: ToolRegistryEntry = {
  slug: "semver-tool",
  name: "SemVer Tool",
  module: "code",
  description: "Validate, compare, sort and bump semantic versions with correct pre-release precedence.",
  aliases: ["semantic versioning","version compare","bump version","sort versions"],
  icon: "Tag",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["semantic versioning","version compare","bump version","sort versions"] },
};
