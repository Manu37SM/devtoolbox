import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonToZodTool: ToolRegistryEntry = {
  slug: "json-to-zod",
  name: "JSON to Zod Schema",
  module: "code",
  description: "Generate a Zod 4 schema and inferred TypeScript type from a JSON sample, detecting emails, UUIDs, URLs and ISO dates, with nested objects, arrays of objects, nullables and optional strict mode.",
  aliases: ["json to zod schema","zod schema generator","typescript runtime validation","json sample to zod","z.object from json"],
  icon: "Braces",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json to zod schema","zod schema generator","typescript runtime validation","json sample to zod","z.object from json"] },
};
