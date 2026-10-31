import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const htaccessGeneratorTool: ToolRegistryEntry = {
  slug: "htaccess-generator",
  name: "Apache .htaccess Generator",
  module: "generators",
  description: "Generate an Apache .htaccess for HTTPS and www redirects, custom redirects, clean URLs, SPA fallback, caching, compression, security headers, basic auth and access control.",
  aliases: ["htaccess", "apache rewrite", "apache redirect https", "mod_rewrite", "apache cache headers", "htaccess deny ip"],
  icon: "FileLock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["apache .htaccess generator", "htaccess", "apache rewrite", "apache redirect https", "mod_rewrite", "apache cache headers", "htaccess deny ip"] },
};
