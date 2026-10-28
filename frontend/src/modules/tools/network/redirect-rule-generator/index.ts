import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const redirectRuleGeneratorTool: ToolRegistryEntry = {
  slug: "redirect-rule-generator",
  name: "Redirect Rule Generator",
  module: "network",
  description: "Convert a list of old to new paths into redirect rules for nginx, Apache, Netlify, Vercel, Caddy or Cloudflare, with loop, duplicate and redirect-chain detection.",
  aliases: ["301 redirect generator","htaccess redirect","nginx redirect","netlify _redirects","vercel redirects json"],
  icon: "Route",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["301 redirect generator","htaccess redirect","nginx redirect","netlify _redirects","vercel redirects json"] },
};
