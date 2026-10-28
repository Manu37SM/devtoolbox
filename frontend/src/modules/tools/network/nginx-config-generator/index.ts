import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const nginxConfigGeneratorTool: ToolRegistryEntry = {
  slug: "nginx-config-generator",
  name: "nginx Config Generator",
  module: "network",
  description: "Generate an nginx server block for a reverse proxy, load balancer, static site, SPA or PHP-FPM, with TLS, HTTP to HTTPS redirect, HSTS, gzip, WebSocket support and security headers.",
  aliases: ["nginx reverse proxy config","nginx server block","nginx ssl config","nginx spa try_files","nginx load balancer upstream"],
  icon: "Server",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["nginx reverse proxy config","nginx server block","nginx ssl config","nginx spa try_files","nginx load balancer upstream"] },
};
