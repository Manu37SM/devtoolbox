import { describe, expect, it } from "vitest";
import { generateRandom } from "./transform";

describe("generateRandom — numbers", () => {
  it("generates numbers within the requested range", () => {
    const result = generateRandom({ kind: "number", min: 1, max: 6, count: 50, allowDuplicates: true });
    expect(result.error).toBeNull();
    expect(result.values).toHaveLength(50);
    for (const v of result.values) {
      const n = Number(v);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
    }
  });

  it("generates unique values when duplicates are disallowed", () => {
    const result = generateRandom({ kind: "number", min: 1, max: 10, count: 10, allowDuplicates: false });
    expect(new Set(result.values).size).toBe(10);
  });

  it("errors when unique count exceeds the available range", () => {
    const result = generateRandom({ kind: "number", min: 1, max: 3, count: 5, allowDuplicates: false });
    expect(result.error).not.toBeNull();
    expect(result.values).toEqual([]);
  });

  it("errors when min is greater than max", () => {
    const result = generateRandom({ kind: "number", min: 10, max: 1, count: 1, allowDuplicates: true });
    expect(result.error).not.toBeNull();
  });

  it("supports negative ranges", () => {
    const result = generateRandom({ kind: "number", min: -5, max: -1, count: 20, allowDuplicates: true });
    for (const v of result.values) {
      const n = Number(v);
      expect(n).toBeGreaterThanOrEqual(-5);
      expect(n).toBeLessThanOrEqual(-1);
    }
  });

  it("handles a single-value range", () => {
    const result = generateRandom({ kind: "number", min: 7, max: 7, count: 3, allowDuplicates: true });
    expect(result.values).toEqual(["7", "7", "7"]);
  });
});

describe("generateRandom — strings", () => {
  it("generates strings of the requested length and count", () => {
    const result = generateRandom({ kind: "string", length: 12, count: 5, charset: "alphanumeric" });
    expect(result.values).toHaveLength(5);
    for (const v of result.values) expect(v).toHaveLength(12);
  });

  it("respects the numeric charset", () => {
    const result = generateRandom({ kind: "string", length: 20, count: 1, charset: "numeric" });
    expect(result.values[0]).toMatch(/^[0-9]+$/);
  });

  it("respects the hex charset", () => {
    const result = generateRandom({ kind: "string", length: 20, count: 1, charset: "hex" });
    expect(result.values[0]).toMatch(/^[0-9a-f]+$/);
  });

  it("respects the alpha charset", () => {
    const result = generateRandom({ kind: "string", length: 20, count: 1, charset: "alpha" });
    expect(result.values[0]).toMatch(/^[A-Za-z]+$/);
  });
});
