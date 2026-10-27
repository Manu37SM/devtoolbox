import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const httpStatusCodesTool: ToolRegistryEntry = {
  slug: "http-status-codes",
  name: "HTTP Status Codes",
  module: "network",
  description: "Searchable reference for HTTP status codes — search by code, class (4xx), name or keyword.",
  aliases: ["http status","status code lookup","404 meaning","http response codes"],
  icon: "Globe",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["http status","status code lookup","404 meaning","http response codes"] },
};
