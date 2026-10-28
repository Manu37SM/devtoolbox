import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const graphqlFormatterTool: ToolRegistryEntry = {
  slug: "graphql-formatter",
  name: "GraphQL Formatter & Minifier",
  module: "code",
  description: "Pretty-print or minify GraphQL queries, mutations, fragments and schema definitions (SDL), with block strings and comments preserved.",
  aliases: ["graphql prettifier","format graphql query","graphql minify","sdl formatter","graphql beautifier"],
  icon: "Braces",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["graphql prettifier","format graphql query","graphql minify","sdl formatter","graphql beautifier"] },
};
