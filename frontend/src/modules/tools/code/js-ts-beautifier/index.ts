import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsTsBeautifierTool: ToolRegistryEntry = {
  slug: "js-ts-beautifier",
  name: "JS/TS Beautifier",
  module: "code",
  description: "Format JavaScript and TypeScript code with Prettier, entirely in your browser.",
  aliases: ["javascript formatter", "typescript formatter", "js beautifier"],
  icon: "Braces",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["javascript formatter online", "typescript formatter", "js beautifier"] },
};
