import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jwtEncoderTool: ToolRegistryEntry = {
  slug: "jwt-encoder",
  name: "JWT Encoder",
  module: "security",
  description: "Sign a JWT with HS256, HS384 or HS512 in your browser. Use throwaway secrets — never paste production keys into any web tool.",
  aliases: ["jwt generator","create jwt","sign jwt","hs256 token"],
  icon: "BadgeCheck",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["jwt generator","create jwt","sign jwt","hs256 token"] },
};
