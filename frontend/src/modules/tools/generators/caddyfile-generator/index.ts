import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const caddyfileGeneratorTool: ToolRegistryEntry = {
  slug: "caddyfile-generator",
  name: "Caddyfile Generator",
  module: "generators",
  description: "Generate a Caddyfile for reverse proxies, static sites, SPAs and redirects with automatic HTTPS, load balancing, compression, security headers, logging and www redirects.",
  aliases: ["caddy config", "caddy reverse proxy", "caddyfile example", "caddy https", "caddy server config", "caddy spa"],
  icon: "Globe",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["caddyfile generator", "caddy config", "caddy reverse proxy", "caddyfile example", "caddy https", "caddy server config", "caddy spa"] },
};
