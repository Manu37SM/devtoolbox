import { describe, expect, it } from "vitest";
import { REGEX_PATTERNS, filterPatterns } from "./transform";

describe("REGEX_PATTERNS", () => {
  it("has at least 20 entries", () => {
    expect(REGEX_PATTERNS.length).toBeGreaterThanOrEqual(20);
  });

  it("every entry has a non-empty pattern, description, and category", () => {
    for (const entry of REGEX_PATTERNS) {
      expect(entry.pattern.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });

  it("covers anchors, character classes, quantifiers, groups, lookarounds, and flags", () => {
    const categories = new Set(REGEX_PATTERNS.map((p) => p.category));
    expect(categories.has("Anchors")).toBe(true);
    expect(categories.has("Character classes")).toBe(true);
    expect(categories.has("Quantifiers")).toBe(true);
    expect(categories.has("Groups")).toBe(true);
    expect(categories.has("Lookarounds")).toBe(true);
    expect(categories.has("Flags")).toBe(true);
  });
});

describe("filterPatterns", () => {
  it("returns all patterns for an empty query", () => {
    expect(filterPatterns(REGEX_PATTERNS, "")).toHaveLength(REGEX_PATTERNS.length);
  });

  it("returns all patterns for a whitespace-only query", () => {
    expect(filterPatterns(REGEX_PATTERNS, "   ")).toHaveLength(REGEX_PATTERNS.length);
  });

  it("matches by exact pattern substring", () => {
    const results = filterPatterns(REGEX_PATTERNS, "\\d");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.pattern === "\\d")).toBe(true);
  });

  it("matches by description substring, case-insensitively", () => {
    const results = filterPatterns(REGEX_PATTERNS, "LOOKAHEAD");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.description.toLowerCase().includes("lookahead"))).toBe(true);
  });

  it("matches by category name", () => {
    const results = filterPatterns(REGEX_PATTERNS, "quantifiers");
    expect(results.every((r) => r.category === "Quantifiers")).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns an empty array when nothing matches", () => {
    const results = filterPatterns(REGEX_PATTERNS, "zzz-not-a-real-token-zzz");
    expect(results).toEqual([]);
  });

  it("trims surrounding whitespace before matching", () => {
    const results = filterPatterns(REGEX_PATTERNS, "  word boundary  ");
    expect(results.length).toBeGreaterThan(0);
  });

  it("is case-insensitive for pattern matches", () => {
    const results = filterPatterns(REGEX_PATTERNS, "ANCHORS");
    expect(results.every((r) => r.category === "Anchors")).toBe(true);
  });
});
