import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jwtDecoderTool: ToolRegistryEntry = {
  slug: "jwt-decoder",
  name: "JWT Decoder",
  module: "encoding",
  description: "Decode and inspect JSON Web Tokens — view header, payload, and expiry at a glance.",
  aliases: ["jwt debugger", "jwt parser", "decode jwt online"],
  icon: "KeyRound",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["jwt decoder", "jwt debugger", "decode jwt online"] },
};
