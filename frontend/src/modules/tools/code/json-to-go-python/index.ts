import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const jsonToGoPythonTool: ToolRegistryEntry = {
  slug: "json-to-go-python",
  name: "JSON to Go Struct / Python Model",
  module: "code",
  description: "Generate Go structs with json tags, or Python dataclasses, Pydantic models and TypedDicts from a JSON sample. Merges array items, marks missing fields optional and handles nested objects.",
  aliases: ["json to golang struct","json to dataclass","json to pydantic","json to typeddict","quicktype go"],
  icon: "FileCode",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json to golang struct","json to dataclass","json to pydantic","json to typeddict","quicktype go"] },
};
