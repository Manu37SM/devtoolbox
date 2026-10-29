import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const awsSigv4CalculatorTool: ToolRegistryEntry = {
  slug: "aws-sigv4-calculator",
  name: "AWS Signature V4 Calculator",
  module: "security",
  description: "Sign AWS API requests with Signature Version 4: canonical request, string to sign, signing key, Authorization header, curl command or presigned URL, for debugging SignatureDoesNotMatch errors.",
  aliases: ["sigv4 signer","aws presigned url generator","signature does not match aws","aws4-hmac-sha256","api gateway iam auth"],
  icon: "Signature",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["sigv4 signer","aws presigned url generator","signature does not match aws","aws4-hmac-sha256","api gateway iam auth"] },
};
