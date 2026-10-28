import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const hexDumpViewerTool: ToolRegistryEntry = {
  slug: "hex-dump-viewer",
  name: "Hex Dump Viewer (xxd)",
  module: "encoding",
  description: "Show text or hex bytes as an xxd-style hex dump with offsets and an ASCII column, or read a dump back into bytes and text.",
  aliases: ["xxd","hexdump","hex viewer","bytes to hex dump","hex editor view"],
  icon: "FileDigit",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["xxd","hexdump","hex viewer","bytes to hex dump","hex editor view"] },
};
