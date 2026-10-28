import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const piiMaskerTool: ToolRegistryEntry = {
  slug: "pii-masker",
  name: "PII Masker",
  module: "security",
  description: "Mask emails, phone numbers, Luhn-valid card numbers, SSNs, Aadhaar and PAN numbers, IBANs and IP addresses in logs or datasets before sharing. Partial, label or full masking, all in your browser.",
  aliases: ["redact personal data","mask credit card numbers","anonymize logs","gdpr data masking","remove emails from text"],
  icon: "EyeOff",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["redact personal data","mask credit card numbers","anonymize logs","gdpr data masking","remove emails from text"] },
};
