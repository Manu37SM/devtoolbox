import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const isbnGtinValidatorTool: ToolRegistryEntry = {
  slug: "isbn-gtin-validator",
  name: "ISBN / EAN / UPC Validator",
  module: "converters",
  description: "Validate ISBN-10, ISBN-13, EAN-13, EAN-8, UPC-A and GTIN-14 check digits, show the correct digit when one is wrong, and convert between ISBN-10 and ISBN-13.",
  aliases: ["isbn checker","barcode check digit","isbn 10 to 13","ean 13 validator","upc a check digit"],
  icon: "ScanBarcode",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["isbn checker","barcode check digit","isbn 10 to 13","ean 13 validator","upc a check digit"] },
};
