import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const upiPaymentLinkBuilderTool: ToolRegistryEntry = {
  slug: "upi-payment-link-builder",
  name: "UPI Payment Link Builder & Parser",
  module: "generators",
  description: "Build NPCI UPI deep links (upi://pay) and app-specific links for GPay, PhonePe and Paytm from a VPA, payee, amount and note, or parse and validate an existing UPI link or QR payload.",
  aliases: ["upi link", "upi deeplink", "upi://pay", "vpa", "upi qr payload", "npci", "payment intent"],
  icon: "Wallet",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["upi payment link builder & parser", "upi link", "upi deeplink", "upi://pay", "vpa", "upi qr payload", "npci", "payment intent"] },
};
