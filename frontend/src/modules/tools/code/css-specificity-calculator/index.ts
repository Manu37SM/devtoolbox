import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const cssSpecificityCalculatorTool: ToolRegistryEntry = {
  slug: "css-specificity-calculator",
  name: "CSS Specificity Calculator",
  module: "code",
  description: "Calculate (a,b,c) specificity for CSS selectors following Selectors Level 4, including :is(), :not(), :has(), :where() and :nth-child(of S), and see which rule wins.",
  aliases: ["selector specificity","css specificity checker","why is my css overridden","specificity calculator","css selector weight"],
  icon: "Crosshair",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["selector specificity","css specificity checker","why is my css overridden","specificity calculator","css selector weight"] },
};
