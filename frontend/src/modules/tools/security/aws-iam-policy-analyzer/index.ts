import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const awsIamPolicyAnalyzerTool: ToolRegistryEntry = {
  slug: "aws-iam-policy-analyzer",
  name: "AWS IAM Policy Analyzer",
  module: "security",
  description: "Review AWS IAM, bucket and trust policies for admin wildcards, privilege escalation, PassRole on *, public principals, GitHub OIDC trusts without sub conditions and NotAction traps, in plain English.",
  aliases: ["iam policy checker","aws policy linter","privilege escalation iam","s3 bucket policy review","least privilege aws"],
  icon: "ShieldAlert",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["iam policy checker","aws policy linter","privilege escalation iam","s3 bucket policy review","least privilege aws"] },
};
