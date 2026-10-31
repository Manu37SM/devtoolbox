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

describe("generateRandom — options", () => {
  it("makes decimals within range with fixed places", () => {
    const r = generateRandom({ kind: "number", min: 0, max: 1, count: 100, decimals: 2 });
    for (const v of r.values) {
      expect(v).toMatch(/^\d\.\d\d$/);
      expect(Number(v)).toBeLessThanOrEqual(1);
    }
  });
  it("sorts ascending and descending", () => {
    const a = generateRandom({ kind: "number", min: 1, max: 1000, count: 50, sort: "asc" }).values.map(Number);
    expect(a).toEqual([...a].sort((x, y) => x - y));
    const d = generateRandom({ kind: "number", min: 1, max: 1000, count: 50, sort: "desc" }).values.map(Number);
    expect(d).toEqual([...d].sort((x, y) => y - x));
  });
  it("draws every value exactly once when count equals range", () => {
    const r = generateRandom({ kind: "number", min: -3, max: 6, count: 10, allowDuplicates: false, sort: "asc" });
    expect(r.values.join(",")).toBe("-3,-2,-1,0,1,2,3,4,5,6");
  });
  it("terminates even if the byte source is constant (no infinite loop)", () => {
    expect(() => generateRandom({ kind: "number", min: 1, max: 100, count: 3 }, (n) => new Uint8Array(n).fill(255))).toThrow();
  });
  it("zero-pads", () => {
    const r = generateRandom({ kind: "number", min: 0, max: 999, count: 30, zeroPad: true });
    for (const v of r.values) expect(v).toHaveLength(3);
  });
  it("rejects ranges with no value at that precision", () => {
    expect(generateRandom({ kind: "number", min: 0.001, max: 0.002, decimals: 1 }).error).not.toBeNull();
  });
  it("uses a custom charset, prefix, suffix and uniqueness", () => {
    const r = generateRandom({ kind: "string", length: 4, count: 30, charset: "custom", customCharset: "ab", prefix: "id_", suffix: "!", unique: true });
    expect(new Set(r.values).size).toBe(r.values.length);
    for (const v of r.values) expect(v).toMatch(/^id_[ab]{4}!$/);
  });
  it("excludes look-alike characters", () => {
    const r = generateRandom({ kind: "string", length: 200, count: 5, charset: "alphanumeric", excludeAmbiguous: true });
    for (const v of r.values) expect(v).not.toMatch(/[0O1lI|5S8B2Z]/);
  });
  it("rejects impossible unique requests and tiny custom sets", () => {
    expect(generateRandom({ kind: "string", length: 1, count: 20, charset: "numeric", unique: true }).error).not.toBeNull();
    expect(generateRandom({ kind: "string", length: 5, count: 1, charset: "custom", customCharset: "a" }).error).not.toBeNull();
  });
  it("supports base32 and uppercase hex", () => {
    expect(generateRandom({ kind: "string", length: 50, count: 1, charset: "base32" }).values[0]).toMatch(/^[A-Z2-7]+$/);
    expect(generateRandom({ kind: "string", length: 50, count: 1, charset: "hexUpper" }).values[0]).toMatch(/^[0-9A-F]+$/);
  });
});
