import { describe, expect, it } from "vitest";
import { toolRegistry } from "@/lib/registry";
import { moduleForPath } from "./nav-utils";
import { FEATURED_SLUGS, resolveFeatured } from "./featured-tools";

describe("moduleForPath", () => {
  it("maps tool and category URLs to their module", () => {
    const t = toolRegistry[0]!;
    expect(moduleForPath(`/tools/${t.slug}`)).toBe(t.module);
    expect(moduleForPath("/category/network")).toBe("network");
  });
  it("returns null for other pages and unknown slugs", () => {
    expect(moduleForPath("/")).toBeNull();
    expect(moduleForPath("/pipelines")).toBeNull();
    expect(moduleForPath("/tools/does-not-exist")).toBeNull();
    expect(moduleForPath("/category/nope")).toBeNull();
  });
});

describe("featured tools", () => {
  it("every curated slug exists in the registry", () => {
    expect(resolveFeatured(FEATURED_SLUGS)).toHaveLength(FEATURED_SLUGS.length);
  });
});
