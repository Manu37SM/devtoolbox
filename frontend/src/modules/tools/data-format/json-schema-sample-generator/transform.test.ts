import { describe, expect, it } from "vitest";
import { generateJsonSample } from "./transform";
import { validate } from "../json-schema-validator/transform";

const USER = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["id", "email"],
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 18, maximum: 30 },
    role: { enum: ["admin", "user"] },
    tags: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3, uniqueItems: true },
    address: { $ref: "#/$defs/address" },
    created: { type: "string", format: "date-time" },
    code: { type: "string", pattern: "^[A-Z]{3}-\\d{4}$" },
    score: { type: "number", minimum: 0, maximum: 1, multipleOf: 0.25 },
  },
  $defs: { address: { type: "object", required: ["city"], properties: { city: { type: "string" }, zip: { type: "string", pattern: "^\\d{5}$" } } } },
};
const gen = (schema: unknown, opts = {}) => JSON.parse(generateJsonSample(JSON.stringify(schema), opts).output);

describe("generateJsonSample", () => {
  it("produces data that validates against the schema, for many seeds", () => {
    for (const seed of [1, 2, 3, 42, 999]) {
      const sample = gen(USER, { seed });
      expect(validate(sample, USER as never), JSON.stringify(sample)).toEqual([]);
    }
  });
  it("is repeatable per seed and varies between seeds", () => {
    const a = generateJsonSample(JSON.stringify(USER), { seed: 5 }).output;
    expect(generateJsonSample(JSON.stringify(USER), { seed: 5 }).output).toBe(a);
    expect(generateJsonSample(JSON.stringify(USER), { seed: 6 }).output).not.toBe(a);
  });
  it("fills only required properties on request and follows $ref", () => {
    const sample = gen(USER, { fill: "required" });
    expect(Object.keys(sample).sort()).toEqual(["email", "id"]);
    expect(gen(USER).address.city).toBeTypeOf("string");
  });
  it("uses enum, const, default and examples, or random enum values when examples are off", () => {
    expect(gen({ type: "object", properties: { a: { enum: ["x", "y"] }, b: { const: 7 }, c: { default: "d" }, d: { examples: [9] } } })).toEqual({ a: "x", b: 7, c: "d", d: 9 });
    const values = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => gen({ enum: ["x", "y", "z"] }, { seed, useExamples: false })));
    expect(values.size).toBeGreaterThan(1);
  });
  it("merges allOf and picks oneOf variants", () => {
    const s = { allOf: [{ type: "object", required: ["a"], properties: { a: { type: "integer" } } }, { properties: { b: { type: "boolean" } } }] };
    expect(Object.keys(gen(s)).sort()).toEqual(["a", "b"]);
    const one = { oneOf: [{ type: "string" }, { type: "integer" }] };
    expect(gen(one, { variant: 0 })).toBeTypeOf("string");
    expect(gen(one, { variant: 1 })).toBeTypeOf("number");
  });
  it("respects array limits and uniqueness, and stops recursive refs", () => {
    expect(gen({ type: "array", items: { type: "integer" }, minItems: 4 }, { arrayLength: 1 })).toHaveLength(4);
    expect(gen({ type: "array", items: { type: "integer" }, maxItems: 1 }, { arrayLength: 5 })).toHaveLength(1);
    const tree = { $ref: "#/$defs/n", $defs: { n: { type: "object", properties: { v: { type: "integer" }, kids: { type: "array", items: { $ref: "#/$defs/n" } } } } } };
    expect(() => gen(tree)).not.toThrow();
    expect(JSON.stringify(gen(tree, { maxDepth: 2 })).length).toBeLessThan(5000);
  });
  it("makes realistic values from property names", () => {
    const s = { type: "object", properties: { firstName: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, age: { type: "integer" } } };
    const v = gen(s);
    expect(v.email).toMatch(/@example\.com$/);
    expect(v.phone).toMatch(/^\+91/);
    expect(v.age).toBeGreaterThanOrEqual(18);
    expect(gen(s, { smartValues: false }).email).not.toMatch(/@/);
  });
  it("supports count, ndjson, compact output and reports bad schemas", () => {
    expect(gen({ type: "integer" }, { count: 3 })).toHaveLength(3);
    expect(generateJsonSample('{"type":"integer"}', { count: 2, format: "ndjson" }).output.split("\n")).toHaveLength(2);
    expect(generateJsonSample('{"type":"null"}', { format: "compact" }).output).toBe("null");
    expect(generateJsonSample("{oops", {}).error?.message).toMatch(/Invalid JSON schema/);
    expect(generateJsonSample("[1]", {}).error?.message).toMatch(/object/);
  });
});
