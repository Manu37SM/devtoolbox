import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const gstCalculatorTool: ToolRegistryEntry = {
  slug: "gst-calculator",
  name: "GST Calculator",
  module: "converters",
  description: "Add GST to a price or back it out of a GST-inclusive price, with the CGST/SGST or IGST split for any slab (0.25% to 28%).",
  aliases: ["gst","cgst sgst","igst","inclusive gst","tax calculator india"],
  icon: "ReceiptText",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["gst","cgst sgst","igst","inclusive gst","tax calculator india"] },
};
