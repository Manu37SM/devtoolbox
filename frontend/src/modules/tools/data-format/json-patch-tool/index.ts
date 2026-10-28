import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonPatchToolTool: ToolRegistryEntry = {
  slug: "json-patch-tool",
  name: "JSON Patch (RFC 6902) Tool",
  module: "data-format",
  description: "Apply an RFC 6902 JSON Patch (add, remove, replace, move, copy, test) to a document, or generate the patch that turns one JSON document into another. Pointers handle ~0 and ~1 escapes.",
  aliases: ["json patch rfc 6902","apply json patch","generate json patch","json pointer operations","kubectl patch json"],
  icon: "GitCompare",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json patch rfc 6902","apply json patch","generate json patch","json pointer operations","kubectl patch json"] },
};
