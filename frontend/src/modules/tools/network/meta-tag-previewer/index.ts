import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const metaTagPreviewerTool: ToolRegistryEntry = {
  slug: "meta-tag-previewer",
  name: "Meta Tag/Open Graph Previewer",
  module: "network",
  description: "Preview how a URL's title, description, and image will look when shared on social platforms.",
  aliases: ["og preview", "open graph checker", "social card preview", "link preview"],
  icon: "LayoutTemplate",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: { keywords: ["open graph preview", "meta tag checker", "social card preview", "og image checker"] },
};

export { MetaTagPreviewerToolView } from "./ToolView";
