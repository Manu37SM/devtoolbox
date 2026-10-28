import { describe, expect, it } from "vitest";
import type { ToolRegistryEntry } from "@devtoolbox/shared";
import { filterTools } from "./tool-filter";
import { resolveFeatured } from "./featured-tools";

const t = (slug: string, name: string, description: string, aliases: string[] = []): ToolRegistryEntry => ({
  slug, name, description, aliases, module: "text", icon: "Type", isClientOnly: true, isWorkerEligible: false, seo: { keywords: [] },
});
const tools = [t("a", "JSON Formatter", "Pretty print JSON", ["beautify"]), t("b", "Base64", "Encode and decode", ["b64"]), t("c", "Text Diff", "Compare two texts")];

describe("filterTools", () => {
  it("returns all tools for an empty query", () => { expect(filterTools(tools, "  ")).toHaveLength(3); });
  it("matches name, description and aliases", () => {
    expect(filterTools(tools, "json").map((x) => x.slug)).toEqual(["a"]);
    expect(filterTools(tools, "compare").map((x) => x.slug)).toEqual(["c"]);
    expect(filterTools(tools, "B64").map((x) => x.slug)).toEqual(["b"]);
  });
  it("requires every term to match", () => {
    expect(filterTools(tools, "pretty json")).toHaveLength(1);
    expect(filterTools(tools, "pretty base64")).toHaveLength(0);
  });
});

describe("resolveFeatured", () => {
  it("skips unknown slugs and keeps order", () => {
    const lookup = (s: string) => tools.find((x) => x.slug === s);
    expect(resolveFeatured(["c", "zzz", "a"], lookup).map((x) => x.slug)).toEqual(["c", "a"]);
  });
});
