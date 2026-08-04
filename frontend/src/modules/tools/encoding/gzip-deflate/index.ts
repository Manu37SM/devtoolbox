import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const gzipDeflateTool: ToolRegistryEntry = {
  slug: "gzip-deflate",
  name: "Gzip/Deflate Compressor",
  module: "encoding",
  description: "Compress text to Gzip or Deflate (base64-encoded) and decompress it back, using your browser's native compression APIs.",
  aliases: ["gzip compress", "gzip decompress", "deflate compress", "text compression tool"],
  icon: "FileArchive",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["gzip compress online", "deflate compress online", "text compression tool"],
  },
};
