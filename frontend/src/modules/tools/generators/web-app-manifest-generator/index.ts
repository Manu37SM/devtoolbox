import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const webAppManifestGeneratorTool: ToolRegistryEntry = {
  slug: "web-app-manifest-generator",
  name: "Web App Manifest Generator (PWA)",
  module: "generators",
  description: "Generate a PWA web app manifest with name, start URL, display mode, theme colours and the standard 192 and 512 pixel icons including a maskable icon, plus the HTML head tags to link it.",
  aliases: ["manifest.json pwa","webmanifest generator","progressive web app manifest","pwa icons maskable","add to home screen manifest"],
  icon: "AppWindow",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["manifest.json pwa","webmanifest generator","progressive web app manifest","pwa icons maskable","add to home screen manifest"] },
};
