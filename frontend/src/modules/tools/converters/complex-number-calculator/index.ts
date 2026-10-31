import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const complexNumberCalculatorTool: ToolRegistryEntry = {
  slug: "complex-number-calculator",
  name: "Complex Number Calculator",
  module: "converters",
  description: "Evaluate complex-number expressions with variables, polar input (5\u222030\u00b0), trig, exp, log and roots, show rectangular, polar and exponential forms, find nth roots and polynomial roots.",
  aliases: ["complex numbers", "imaginary numbers", "polar form", "euler formula", "nth roots of unity", "polynomial roots", "phasor", "complex calculator", "de moivre"],
  icon: "Sigma",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["complex number calculator", "complex numbers", "imaginary numbers", "polar form", "euler formula", "nth roots of unity", "polynomial roots", "phasor", "complex calculator", "de moivre"] },
};
