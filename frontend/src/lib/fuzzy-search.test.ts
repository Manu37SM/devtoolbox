import { describe, expect, it } from "vitest";
import { searchTools } from "./fuzzy-search";
import type { ToolRegistryEntry } from "@devtoolbox/shared";

const tools: ToolRegistryEntry[] = [
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    module: "data-format",
    description: "Format and validate JSON",
    aliases: ["json beautifier", "pretty print json"],
    icon: "Braces",
    isClientOnly: true,
    isWorkerEligible: false,
    seo: { keywords: [] },
  },
  {
    slug: "base64",
    name: "Base64 Encode/Decode",
    module: "encoding",
    description: "Encode or decode Base64",
    aliases: ["base64 encoder"],
    icon: "Binary",
    isClientOnly: true,
    isWorkerEligible: false,
    seo: { keywords: [] },
  },
];

describe("searchTools", () => {
  it("returns all tools for an empty query", () => {
    expect(searchTools(tools, "")).toEqual(tools);
  });

  it("matches by exact name", () => {
    const result = searchTools(tools, "JSON Formatter");
    expect(result[0]!.slug).toBe("json-formatter");
  });

  it("matches by partial name", () => {
    const result = searchTools(tools, "json");
    expect(result.map((t) => t.slug)).toContain("json-formatter");
  });

  it("matches by alias", () => {
    const result = searchTools(tools, "beautifier");
    expect(result.map((t) => t.slug)).toContain("json-formatter");
  });

  it("matches by description", () => {
    const result = searchTools(tools, "decode base64");
    expect(result.map((t) => t.slug)).toContain("base64");
  });

  it("returns nothing for a query matching no tool", () => {
    expect(searchTools(tools, "zzzznotfound")).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(searchTools(tools, "JSON").map((t) => t.slug)).toContain("json-formatter");
  });
});
