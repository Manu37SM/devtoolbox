import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const kongConfigGeneratorTool: ToolRegistryEntry = {
  slug: "kong-config-generator",
  name: "Kong Declarative Config Generator",
  module: "network",
  description: "Create Kong declarative kong.yml (or Admin API curl commands) for services, routes and plugins like rate-limiting, key-auth, jwt, cors, ip-restriction, acl and request-size-limiting.",
  aliases: ["kong.yml generator","kong declarative config","kong service route plugin","kong rate limiting config","deck config"],
  icon: "Waypoints",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["kong.yml generator","kong declarative config","kong service route plugin","kong rate limiting config","deck config"] },
};
