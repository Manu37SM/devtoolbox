import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const pxRemConverterTool: ToolRegistryEntry = {
  slug: "px-rem-converter",
  name: "PX / REM / EM Converter",
  module: "converters",
  description: "Convert CSS lengths between px, rem, em, pt and % against a configurable base font size.",
  aliases: ["px to rem", "rem to px", "em to px", "pt to px", "css unit converter"],
  icon: "Ruler",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["px to rem converter", "rem to px", "em to px", "css unit converter", "pt to px"] },
};
