import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const contentDispositionBuilderTool: ToolRegistryEntry = {
  slug: "content-disposition-builder",
  name: "Content-Disposition Header Builder",
  module: "network",
  description: "Build and parse Content-Disposition headers with correct filename and RFC 8187 filename* encoding for non-ASCII names, plus a quoted-string fallback for old clients.",
  aliases: ["content-disposition", "filename*", "rfc 6266", "rfc 8187", "attachment filename", "download header"],
  icon: "Download",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["content-disposition header builder", "content-disposition", "filename*", "rfc 6266", "rfc 8187", "attachment filename", "download header"] },
};
