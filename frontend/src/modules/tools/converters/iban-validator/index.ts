import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ibanValidatorTool: ToolRegistryEntry = {
  slug: "iban-validator",
  name: "IBAN Validator",
  module: "converters",
  description: "Validate IBANs (country, length, mod-97 check digits), suggest the correct check digits and split out the BBAN.",
  aliases: ["iban check","iban formatter","validate iban","bank account number validator"],
  icon: "Landmark",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["iban check","iban formatter","validate iban","bank account number validator"] },
};
