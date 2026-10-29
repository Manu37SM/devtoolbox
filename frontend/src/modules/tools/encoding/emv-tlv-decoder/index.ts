import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const emvTlvDecoderTool: ToolRegistryEntry = {
  slug: "emv-tlv-decoder",
  name: "EMV TLV Decoder",
  module: "encoding",
  description: "Decode EMV chip card BER-TLV data (ICC field 55, GPO and READ RECORD responses) with tag names and plain-English TVR, TSI, AIP, CID and CVM results, masking PAN and track data.",
  aliases: ["emv tag decoder","field 55 decoder","tvr decoder","emv tlv parser","chip card data decoder"],
  icon: "Nfc",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["emv tag decoder","field 55 decoder","tvr decoder","emv tlv parser","chip card data decoder"] },
};
