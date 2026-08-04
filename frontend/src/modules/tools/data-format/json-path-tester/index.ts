import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonPathTesterTool: ToolRegistryEntry = {
  slug: "json-path-tester",
  name: "JSON Path Tester",
  module: "data-format",
  description: "Run JMESPath queries against a JSON document and preview the matched result live.",
  aliases: ["jmespath tester", "json query", "json path evaluator"],
  icon: "Route",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: {
    keywords: ["jmespath tester", "json path tester", "json query tool", "jmespath online"],
  },
};
