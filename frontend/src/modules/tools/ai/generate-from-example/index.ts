import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const generateFromExampleTool: ToolRegistryEntry = {
  slug: "generate-from-example",
  name: "Generate From Example",
  module: "ai",
  description: "Infer a regex or JSON Schema purely from pasted example data — no natural-language description needed.",
  aliases: ["example to regex", "sample to json schema", "infer pattern from examples", "json to schema description"],
  icon: "Braces",
  isClientOnly: false,
  isWorkerEligible: false,
  seo: {
    keywords: ["generate regex from examples", "infer json schema from sample json", "ai schema inference"],
  },
};

export { GenerateFromExampleToolView } from "./ToolView";
