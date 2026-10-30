import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sourceMapResolverTool: ToolRegistryEntry = {
  slug: "source-map-resolver",
  name: "Source Map Resolver",
  module: "code",
  description: "Map minified JavaScript positions or whole stack traces back to original source files, lines, columns and symbol names using a .map file, with source context and 0/1-based column control.",
  aliases: ["sourcemap", "source map decoder", "deminify stack trace", "map file lookup", "unminify error", "vlq decoder"],
  icon: "Map",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["source map resolver", "sourcemap", "source map decoder", "deminify stack trace", "map file lookup", "unminify error", "vlq decoder"] },
};
