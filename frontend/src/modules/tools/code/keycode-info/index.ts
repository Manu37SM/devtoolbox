import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const keycodeInfoTool: ToolRegistryEntry = {
  slug: "keycode-info",
  name: "Key Code Inspector",
  module: "code",
  description: "Press any key to see event.key, event.code, keyCode, location and modifiers — plus a ready-to-paste handler snippet.",
  aliases: ["keycode","keyboard event viewer","event.key","javascript key codes"],
  icon: "Keyboard",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["keycode","keyboard event viewer","event.key","javascript key codes"] },
};
