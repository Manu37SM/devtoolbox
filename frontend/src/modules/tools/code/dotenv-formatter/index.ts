import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dotenvFormatterTool: ToolRegistryEntry = {
  slug: "dotenv-formatter",
  name: "Dotenv Formatter",
  module: "code",
  description: "Format, sort, and validate .env file contents entirely in your browser.",
  aliases: ["env formatter", ".env sorter", "dotenv validator"],
  icon: "FileKey",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["dotenv formatter", "env file formatter", "sort env keys"] },
};
