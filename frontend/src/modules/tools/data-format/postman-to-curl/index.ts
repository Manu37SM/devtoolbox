import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const postmanToCurlTool: ToolRegistryEntry = {
  slug: "postman-to-curl",
  name: "Postman Collection to cURL",
  module: "data-format",
  description: "Convert a Postman collection (v2.0 or v2.1 export) into cURL commands for Bash or PowerShell, resolving variables, inherited auth, raw, form, multipart and GraphQL bodies.",
  aliases: ["postman to curl","export postman as curl","postman collection converter","postman to shell script","collection v2.1 to curl"],
  icon: "Send",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["postman to curl","export postman as curl","postman collection converter","postman to shell script","collection v2.1 to curl"] },
};
