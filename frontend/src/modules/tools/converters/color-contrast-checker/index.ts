import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const colorContrastCheckerTool: ToolRegistryEntry = {
  slug: "color-contrast-checker",
  name: "Color Contrast Checker",
  module: "converters",
  description: "Check WCAG 2.x contrast ratios for foreground/background hex colors against AA and AAA for normal and large text.",
  aliases: ["wcag contrast","accessibility contrast checker","a11y color contrast","contrast ratio"],
  icon: "Contrast",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["wcag contrast","accessibility contrast checker","a11y color contrast","contrast ratio"] },
};
