import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const codeownersTesterTool: ToolRegistryEntry = {
  slug: "codeowners-tester",
  name: "CODEOWNERS Tester & Linter",
  module: "code",
  description: "Test which owners a CODEOWNERS file assigns to file paths (GitHub or GitLab sections), see which rule wins, and lint invalid owners, unsupported syntax, shadowed and duplicate rules.",
  aliases: ["codeowners", "code owners", "github codeowners", "gitlab codeowners", "who owns this file", "codeowners lint", "codeowners validator"],
  icon: "Users",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["codeowners tester & linter", "codeowners", "code owners", "github codeowners", "gitlab codeowners", "who owns this file", "codeowners lint", "codeowners validator"] },
};
