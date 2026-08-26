import { describe, expect, it } from "vitest";
import { generateMockApiResponse } from "./transform";
import type { MockApiResponseOptions } from "./schema";

const base: MockApiResponseOptions = {
  fields: [
    { name: "id", type: "uuid" },
    { name: "name", type: "name" },
    { name: "email", type: "email" },
  ],
  count: 3,
  wrapInDataKey: false,
  seed: 42,
};

describe("generateMockApiResponse", () => {
  it("generates the requested number of records with the requested fields", () => {
    const result = generateMockApiResponse(base);
    expect(result.error).toBeNull();
    const records = JSON.parse(result.output);
    expect(records).toHaveLength(3);
    for (const record of records) {
      expect(Object.keys(record)).toEqual(["id", "name", "email"]);
      expect(typeof record.id).toBe("string");
      expect(typeof record.email).toBe("string");
    }
  });

  it("wraps records in a data key when requested", () => {
    const result = generateMockApiResponse({ ...base, wrapInDataKey: true });
    const parsed = JSON.parse(result.output);
    expect(Array.isArray(parsed.data)).toBe(true);
    expect(parsed.data).toHaveLength(3);
  });

  it("produces the same output for the same seed", () => {
    const r1 = generateMockApiResponse({ ...base, seed: 7 });
    const r2 = generateMockApiResponse({ ...base, seed: 7 });
    expect(r1.output).toBe(r2.output);
  });

  it("generates plausible values for numeric/boolean/date field types", () => {
    const result = generateMockApiResponse({
      fields: [
        { name: "age", type: "int" },
        { name: "price", type: "float" },
        { name: "active", type: "boolean" },
        { name: "createdAt", type: "date" },
      ],
      count: 1,
      wrapInDataKey: false,
      seed: 1,
    });
    const [record] = JSON.parse(result.output);
    expect(typeof record.age).toBe("number");
    expect(typeof record.price).toBe("number");
    expect(typeof record.active).toBe("boolean");
    expect(() => new Date(record.createdAt).toISOString()).not.toThrow();
  });

  it("errors on an empty field name", () => {
    const result = generateMockApiResponse({ ...base, fields: [{ name: "  ", type: "word" }] });
    expect(result.error).not.toBeNull();
  });

  it("errors on duplicate field names", () => {
    const result = generateMockApiResponse({
      ...base,
      fields: [
        { name: "x", type: "word" },
        { name: "x", type: "int" },
      ],
    });
    expect(result.error).not.toBeNull();
  });

  it("errors on an out-of-range count", () => {
    expect(generateMockApiResponse({ ...base, count: 0 }).error).not.toBeNull();
    expect(generateMockApiResponse({ ...base, count: 501 }).error).not.toBeNull();
  });
});
