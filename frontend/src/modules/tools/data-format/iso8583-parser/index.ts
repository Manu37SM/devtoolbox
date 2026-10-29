import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const iso8583ParserTool: ToolRegistryEntry = {
  slug: "iso8583-parser",
  name: "ISO 8583 Message Parser",
  module: "data-format",
  description: "Parse ISO 8583 card payment messages (ASCII or BCD, primary and secondary bitmaps) into fields with names, MTI breakdown, amounts and response codes, masking PAN, track and PIN data.",
  aliases: ["iso8583 decoder","parse iso 8583 message","mti bitmap decoder","card switch message parser","iso8583 field 39"],
  icon: "CreditCard",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["iso8583 decoder","parse iso 8583 message","mti bitmap decoder","card switch message parser","iso8583 field 39"] },
};
