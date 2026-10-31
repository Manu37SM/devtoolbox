import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const bankIdentifierValidatorTool: ToolRegistryEntry = {
  slug: "bank-identifier-validator",
  name: "Bank Identifier Validator (BIC, ABA, Sort Code, IFSC)",
  module: "network",
  description: "Validate and break down SWIFT/BIC codes, US ABA routing numbers, UK sort codes, Indian IFSC, Australian BSB and Canadian transit numbers, including checksums and test-BIC detection.",
  aliases: ["swift bic validator", "aba routing number", "sort code", "ifsc validator", "bsb", "bank code"],
  icon: "Landmark",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["bank identifier validator (bic, aba, sort code, ifsc)", "swift bic validator", "aba routing number", "sort code", "ifsc validator", "bsb", "bank code"] },
};
