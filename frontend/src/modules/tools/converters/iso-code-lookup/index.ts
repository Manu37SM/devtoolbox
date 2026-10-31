import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const isoCodeLookupTool: ToolRegistryEntry = {
  slug: "iso-code-lookup",
  name: "ISO Country, Currency & Language Codes",
  module: "converters",
  description: "Look up ISO 3166 country codes, ISO 4217 currencies and ISO 639 languages by code or name, with alpha-2, alpha-3 and numeric forms and search by partial text.",
  aliases: ["iso 3166", "country codes", "currency codes", "language codes", "iso 4217", "iso 639", "alpha-2 alpha-3", "country code lookup"],
  icon: "Languages",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["iso country, currency & language codes", "iso 3166", "country codes", "currency codes", "language codes", "iso 4217", "iso 639", "alpha-2 alpha-3", "country code lookup"] },
};
