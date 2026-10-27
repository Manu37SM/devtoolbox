import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const indianIdValidatorTool: ToolRegistryEntry = {
  slug: "indian-id-validator",
  name: "Indian ID Validator (Aadhaar, PAN, GSTIN, IFSC)",
  module: "converters",
  description: "Check the format and checksum of Aadhaar (Verhoeff), GSTIN, PAN (holder type) and IFSC codes locally. Format checks only — it can't tell if an ID was actually issued.",
  aliases: ["aadhaar validator","pan validator","gstin checker","ifsc validator","verhoeff"],
  icon: "IdCard",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["aadhaar validator","pan validator","gstin checker","ifsc validator","verhoeff"] },
};
