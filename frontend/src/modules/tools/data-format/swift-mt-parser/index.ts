import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const swiftMtParserTool: ToolRegistryEntry = {
  slug: "swift-mt-parser",
  name: "SWIFT MT Message Parser (MT103, MT202, MT940)",
  module: "data-format",
  description: "Parse SWIFT MT messages into headers and named fields: MT103 and MT202 payments, MT940 and MT942 statements, with value dates, amounts, parties, UETR and mandatory-field validation.",
  aliases: ["swift mt", "mt103", "mt202", "mt940", "swift message", "fin message", "bank statement mt", "uetr"],
  icon: "Landmark",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["swift mt message parser (mt103, mt202, mt940)", "swift mt", "mt103", "mt202", "mt940", "swift message", "fin message", "bank statement mt", "uetr"] },
};
