import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const legacyTextEncodingsTool: ToolRegistryEntry = {
  slug: "legacy-text-encodings",
  name: "Ascii85, Base45, Z85, Quoted-Printable & UUencode",
  module: "encoding",
  description: "Encode and decode Quoted-Printable (MIME email), Ascii85 (PDF and PostScript), Z85 (ZeroMQ), Base45 (QR codes, EU certificates) and UUencode, with binary results shown as hex.",
  aliases: ["quoted printable decoder","ascii85 decode","base45 decoder","z85 encoder","uudecode online"],
  icon: "Archive",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["quoted printable decoder","ascii85 decode","base45 decoder","z85 encoder","uudecode online"] },
};
