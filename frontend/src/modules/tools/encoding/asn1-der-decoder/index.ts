import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const asn1DerDecoderTool: ToolRegistryEntry = {
  slug: "asn1-der-decoder",
  name: "ASN.1 DER Decoder",
  module: "encoding",
  description: "Decode ASN.1 DER or BER from PEM, base64 or hex into a tree with offsets, tag names, named OIDs, times and strings, opening encapsulated OCTET and BIT STRINGs.",
  aliases: ["asn1 parser online","der decoder","decode certificate asn.1","openssl asn1parse online","ber tlv viewer"],
  icon: "Binary",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["asn1 parser online","der decoder","decode certificate asn.1","openssl asn1parse online","ber tlv viewer"] },
};
