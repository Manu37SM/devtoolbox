import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const colorBlindnessSimulatorTool: ToolRegistryEntry = {
  slug: "color-blindness-simulator",
  name: "Color Blindness Simulator",
  module: "image",
  description: "Preview how an uploaded image looks under protanopia, deuteranopia, tritanopia, or achromatopsia.",
  aliases: ["color blindness preview", "colorblind simulator", "deuteranopia simulator"],
  icon: "Eye",
  isClientOnly: true,
  isWorkerEligible: true,
  seo: { keywords: ["color blindness simulator", "colorblind test image", "deuteranopia protanopia simulator"] },
};
