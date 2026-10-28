import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const openapiViewerTool: ToolRegistryEntry = {
  slug: "openapi-viewer",
  name: "OpenAPI / Swagger Viewer & Linter",
  module: "data-format",
  description: "Paste an OpenAPI 3.x or Swagger 2.0 spec (JSON or YAML) to see endpoints by tag, auth, schemas and a design lint: duplicate operationIds, undeclared path params, missing error responses and more.",
  aliases: ["swagger viewer","openapi lint","openapi endpoints list","swagger ui alternative","openapi validator"],
  icon: "FileSearch",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["swagger viewer","openapi lint","openapi endpoints list","swagger ui alternative","openapi validator"] },
};
