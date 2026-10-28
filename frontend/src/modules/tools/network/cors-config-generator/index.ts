import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const corsConfigGeneratorTool: ToolRegistryEntry = {
  slug: "cors-config-generator",
  name: "CORS Config Generator",
  module: "network",
  description: "Generate CORS configuration for Spring MVC, Spring Security, nginx, Apache, Express and Kong from one set of origins, methods and headers, and catch the wildcard-with-credentials mistake.",
  aliases: ["spring boot cors config","nginx cors headers","access-control-allow-origin","cors allowed origins","cors preflight setup"],
  icon: "ArrowLeftRight",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["spring boot cors config","nginx cors headers","access-control-allow-origin","cors allowed origins","cors preflight setup"] },
};
