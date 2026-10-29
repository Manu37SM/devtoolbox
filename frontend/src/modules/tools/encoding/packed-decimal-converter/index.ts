import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const packedDecimalConverterTool: ToolRegistryEntry = {
  slug: "packed-decimal-converter",
  name: "COBOL Packed Decimal (COMP-3) Converter",
  module: "encoding",
  description: "Decode and encode COBOL COMP-3 packed decimal, zoned DISPLAY and COMP binary fields from a PIC clause like S9(7)V99, with sign nibbles, implied decimals and overflow checks.",
  aliases: ["comp-3 decoder","packed decimal to number","cobol pic converter","zoned decimal ebcdic","mainframe numeric field"],
  icon: "Landmark",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["comp-3 decoder","packed decimal to number","cobol pic converter","zoned decimal ebcdic","mainframe numeric field"] },
};
