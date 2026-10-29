import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const emailHeaderAnalyzerTool: ToolRegistryEntry = {
  slug: "email-header-analyzer",
  name: "Email Header Analyzer",
  module: "network",
  description: "Analyze raw email headers: delivery path with per-hop delays, SPF, DKIM and DMARC results and alignment, Reply-To mismatches and bulk-sender unsubscribe requirements. Nothing leaves your browser.",
  aliases: ["email header analyzer","message headers spf dkim","phishing email check","received headers trace","dmarc alignment check"],
  icon: "MailSearch",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["email header analyzer","message headers spf dkim","phishing email check","received headers trace","dmarc alignment check"] },
};
