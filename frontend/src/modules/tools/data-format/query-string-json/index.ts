import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const queryStringJsonTool: ToolRegistryEntry = {
  slug: "query-string-json",
  name: "Query String ↔ JSON",
  module: "data-format",
  description: "Turn URL query strings into JSON (with repeated keys and a[b][]=c nesting) and JSON back into a query string.",
  aliases: ["querystring to json", "url params to json", "json to query string", "search params converter"],
  icon: "Link2",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["query string to json", "json to query string", "url parameters to json", "parse query string"] },
};
