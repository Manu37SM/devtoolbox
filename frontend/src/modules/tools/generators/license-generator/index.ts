import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const licenseGeneratorTool: ToolRegistryEntry = {
  slug: "license-generator",
  name: "Open-Source License Generator",
  module: "generators",
  description: "Generate MIT, ISC, BSD-2/3-Clause, Unlicense or Apache-2.0 license text with your name and year, or a short SPDX source-file header in your comment style.",
  aliases: ["mit license","license file","spdx header","choose license","apache license header"],
  icon: "Scale",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["mit license","license file","spdx header","choose license","apache license header"] },
};
