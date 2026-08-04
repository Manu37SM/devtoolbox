import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const httpRequestTesterTool: ToolRegistryEntry = {
  slug: "http-request-tester",
  name: "HTTP Request Tester",
  module: "network",
  description: "Send HTTP requests with custom methods, headers, and body, and inspect the response.",
  aliases: ["postman lite", "http client", "api tester", "rest client"],
  icon: "Send",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["http request tester online", "api tester", "rest client online", "http client browser"] },
};

export { HttpRequestTesterToolView } from "./ToolView";
