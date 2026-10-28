import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const packageJsonValidatorTool: ToolRegistryEntry = {
  slug: "package-json-validator",
  name: "package.json Validator",
  module: "code",
  description: "Validate a package.json: npm name rules, semver and dependency ranges, git and file specifiers, scripts, engines, exports, bin and publishing readiness, with severity-ranked findings.",
  aliases: ["validate package.json","npm package name rules","semver range checker","package json lint","npm publish checklist"],
  icon: "PackageCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["validate package.json","npm package name rules","semver range checker","package json lint","npm publish checklist"] },
};
