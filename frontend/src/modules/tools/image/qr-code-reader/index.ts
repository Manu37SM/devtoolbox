import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const qrCodeReaderTool: ToolRegistryEntry = {
  slug: "qr-code-reader",
  name: "QR Code Reader",
  module: "image",
  description: "Decode QR codes from an uploaded image, entirely in your browser.",
  aliases: ["qr code scanner", "qr code decoder", "read qr code from image"],
  icon: "ScanLine",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["qr code reader", "qr code decoder", "scan qr code from image"] },
};
