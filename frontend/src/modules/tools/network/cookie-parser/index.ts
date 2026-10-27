import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cookieParserTool: ToolRegistryEntry = {
  slug: "cookie-parser",
  name: "Cookie Parser",
  module: "network",
  description: "Parse Cookie and Set-Cookie headers into name, value and attributes, with warnings for missing Secure, HttpOnly and SameSite.",
  aliases: ["set-cookie parser","cookie header","samesite checker","cookie flags"],
  icon: "Cookie",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["set-cookie parser","cookie header","samesite checker","cookie flags"] },
};
