import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const mimeEncodedWordConverterTool: ToolRegistryEntry = {
  slug: "mime-encoded-word-converter",
  name: "Quoted-Printable & MIME Words",
  module: "encoding",
  description: "Encode and decode quoted-printable bodies and RFC 2047 encoded-words used in email headers, with charset, line-length and Q or B encoding options.",
  aliases: ["quoted printable", "rfc 2047", "encoded word", "mime header decode", "=?utf-8?q?", "qp encode"],
  icon: "Mail",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["quoted-printable & mime words", "quoted printable", "rfc 2047", "encoded word", "mime header decode", "=?utf-8?q?", "qp encode"] },
};
