import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const qrCodeGeneratorTool: ToolRegistryEntry = {
  slug: "qr-code-generator",
  name: "QR Code Generator",
  module: "image",
  description: "Generate QR codes for text, URLs, WiFi credentials, or vCards, entirely in your browser.",
  aliases: ["qr code maker", "wifi qr code", "vcard qr code"],
  icon: "QrCode",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["qr code generator", "wifi qr code generator", "vcard qr code"] },
};
