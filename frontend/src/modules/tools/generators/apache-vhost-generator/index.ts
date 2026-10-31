import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const apacheVhostGeneratorTool: ToolRegistryEntry = {
  slug: "apache-vhost-generator",
  name: "Apache Virtual Host Generator",
  module: "generators",
  description: "Generate Apache httpd VirtualHost blocks for static sites, reverse proxies, PHP-FPM and SPAs with Let's Encrypt TLS, HTTP/2, HSTS, www redirects, security headers and compression.",
  aliases: ["apache vhost", "httpd virtualhost", "apache2 site config", "a2ensite", "apache reverse proxy", "apache ssl config"],
  icon: "Server",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["apache virtual host generator", "apache vhost", "httpd virtualhost", "apache2 site config", "a2ensite", "apache reverse proxy", "apache ssl config"] },
};
