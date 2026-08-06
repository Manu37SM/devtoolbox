import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const apiResponseToClientCodeTool: ToolRegistryEntry = {
  slug: "api-response-to-client-code",
  name: "API Response → Client Code Generator",
  module: "ai",
  description: "Paste a sample JSON API response and get a typed fetch or axios client function plus its response type.",
  aliases: ["json to typescript client", "generate api client", "fetch client generator", "axios client generator"],
  icon: "FileCode2",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: {
    keywords: ["generate typed api client", "json response to typescript", "ai fetch client generator"],
  },
};

export { ApiResponseToClientCodeToolView } from "./ToolView";
