import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const envFileCompareTool: ToolRegistryEntry = {
  slug: "env-file-compare",
  name: ".env File Compare",
  module: "code",
  description: "Diff two .env files by key: missing keys, extra keys and changed values. Values are masked by default so you can paste real secrets safely. Nothing leaves your browser.",
  aliases: ["env diff","compare dotenv files","missing environment variables",".env.example check","env drift"],
  icon: "FileDiff",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["env diff","compare dotenv files","missing environment variables",".env.example check","env drift"] },
};
