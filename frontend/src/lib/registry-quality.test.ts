import { describe, expect, it } from "vitest";
import { icons } from "lucide-react";
import { toolRegistry } from "@/lib/registry";
import { toolViewRegistry } from "@/lib/tool-view-registry";
import { MODULE_META, MODULE_ORDER } from "@/lib/module-meta";
import { FEATURED_SLUGS, resolveFeatured } from "@/lib/featured-tools";

/**
 * Catalog quality gate: keeps the tool list free of duplicates, thin pages and
 * broken icons so we never ship low-effort or spammy entries.
 */
describe("tool registry quality", () => {
  it("has unique, URL-safe slugs", () => {
    const slugs = toolRegistry.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("has unique names (case-insensitive)", () => {
    const names = toolRegistry.map((t) => t.name.trim().toLowerCase());
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it("has a meaningful, bounded description for every tool", () => {
    for (const t of toolRegistry) {
      expect(t.description.length, `${t.slug} description too short`).toBeGreaterThanOrEqual(30);
      expect(t.description.length, `${t.slug} description too long`).toBeLessThanOrEqual(200);
    }
  });

  it("uses descriptions that are not duplicated across tools", () => {
    const d = toolRegistry.map((t) => t.description.trim().toLowerCase());
    expect(d.filter((x, i) => d.indexOf(x) !== i)).toEqual([]);
  });

  it("only uses icons that exist in lucide-react", () => {
    const missing = toolRegistry.filter((t) => !(t.icon in icons)).map((t) => `${t.slug}:${t.icon}`);
    expect(missing).toEqual([]);
  });

  it("every tool has a registered view and every view a tool", () => {
    const slugs = new Set(toolRegistry.map((t) => t.slug));
    const views = new Set(Object.keys(toolViewRegistry));
    expect([...slugs].filter((s) => !views.has(s))).toEqual([]);
    expect([...views].filter((s) => !slugs.has(s))).toEqual([]);
  });

  it("every module is in MODULE_ORDER/MODULE_META with at least one tool", () => {
    const used = new Set(toolRegistry.map((t) => t.module));
    for (const m of used) {
      expect(MODULE_ORDER).toContain(m);
      expect(MODULE_META[m]).toBeDefined();
    }
    for (const m of MODULE_ORDER) expect(used.has(m), `${m} has no tools`).toBe(true);
  });

  it("featured slugs all resolve to real tools", () => {
    expect(resolveFeatured(FEATURED_SLUGS).length).toBe(FEATURED_SLUGS.length);
  });
});
