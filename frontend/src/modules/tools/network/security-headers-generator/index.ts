import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const securityHeadersGeneratorTool: ToolRegistryEntry = {
  slug: "security-headers-generator",
  name: "Security Headers Generator",
  module: "network",
  description: "Generate HSTS, CSP, frame, referrer, permissions and cross-origin headers for nginx, Apache, Express, Spring Security, Kong, Apigee, IIS, Caddy, Netlify or Vercel, with checks on weak values.",
  aliases: ["security headers nginx","spring security headers config","hsts header generator","http security headers","kong response headers"],
  icon: "ShieldPlus",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["security headers nginx","spring security headers config","hsts header generator","http security headers","kong response headers"] },
};
