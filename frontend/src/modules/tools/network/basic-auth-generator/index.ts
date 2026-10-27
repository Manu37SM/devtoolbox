import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const basicAuthGeneratorTool: ToolRegistryEntry = {
  slug: "basic-auth-generator",
  name: "Basic Auth Header",
  module: "network",
  description: "Build an HTTP Basic Authorization header from username:password, or decode one. Base64 is encoding, not encryption.",
  aliases: ["basic authorization header","http basic auth","base64 credentials","authorization header"],
  icon: "UserLock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["basic authorization header","http basic auth","base64 credentials","authorization header"] },
};
