import { describe, expect, it } from "vitest";
import { runJsonSchemaValidator, validate } from "./transform";

const SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["id", "email", "items"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    email: { type: "string", format: "email" },
    status: { enum: ["NEW", "PAID"] },
    items: { type: "array", minItems: 1, items: { $ref: "#/$defs/item" } },
    note: { type: ["string", "null"], maxLength: 5 },
  },
  $defs: { item: { type: "object", required: ["sku", "qty"], properties: { sku: { type: "string", pattern: "^[A-Z]{2}\\d+$" }, qty: { type: "integer", exclusiveMinimum: 0 } } } },
};

describe("validate", () => {
  it("accepts valid data", () => {
    expect(validate({ id: 1, email: "a@b.co", items: [{ sku: "AB1", qty: 2 }], note: null }, SCHEMA)).toEqual([]);
  });
  it("reports every problem with a JSON pointer", () => {
    const issues = validate({ id: 0, email: "nope", status: "LOST", items: [{ sku: "x", qty: 0 }], extra: true, note: "toolong" }, SCHEMA);
    expect(issues.map((i) => `${i.path} ${i.keyword}`)).toEqual([
      "/id minimum", "/email format", "/status enum", "/items/0/sku pattern", "/items/0/qty exclusiveMinimum", "/extra additionalProperties", "/note maxLength",
    ]);
  });
  it("handles combinators, conditionals and tuple forms", () => {
    const s = { oneOf: [{ type: "integer" }, { type: "number", multipleOf: 0.5 }] };
    expect(validate(2, s)[0]!.message).toContain("matched 2");
    expect(validate(1.5, s)).toEqual([]);
    const cond = { if: { properties: { country: { const: "IN" } } }, then: { required: ["pan"] }, else: { required: ["ssn"] } };
    expect(validate({ country: "IN" }, cond)[0]!.message).toBe('missing required property "pan"');
    expect(validate({ country: "US" }, cond)[0]!.message).toBe('missing required property "ssn"');
    expect(validate([1, "a", true], { prefixItems: [{ type: "integer" }, { type: "string" }], items: false })[0]!.keyword).toBe("false");
    expect(validate([1, "a"], { items: [{ type: "integer" }], additionalItems: { type: "integer" } })[0]!.path).toBe("/1");
    expect(validate([1, 1], { uniqueItems: true })[0]!.keyword).toBe("uniqueItems");
    expect(validate([1, 2], { contains: { const: 3 } })[0]!.message).toContain("found 0");
    expect(validate({ a: 1 }, { dependentRequired: { a: ["b"] } })[0]!.message).toBe('"a" requires "b"');
    expect(validate("x", { not: { type: "string" } })[0]!.keyword).toBe("not");
  });
  it("checks formats only when asked and counts code points", () => {
    expect(validate("2024-02-30", { format: "date" })).toHaveLength(1);
    expect(validate("2024-02-30", { format: "date" }, false)).toEqual([]);
    expect(validate("😀😀", { maxLength: 2 })).toEqual([]);
    expect(validate("2024-01-31T10:00:00Z", { format: "date-time" })).toEqual([]);
  });
  it("supports recursive $ref with definitions", () => {
    const tree = { definitions: { node: { type: "object", properties: { children: { type: "array", items: { $ref: "#/definitions/node" } } } } }, $ref: "#/definitions/node" };
    expect(validate({ children: [{ children: [] }] }, tree)).toEqual([]);
    expect(validate({ children: [{ children: 1 }] }, tree)[0]!.path).toBe("/children/0/children");
  });
});

describe("runJsonSchemaValidator", () => {
  it("summarises the result", () => {
    expect(runJsonSchemaValidator('{"id":1}', '{"required":["id"]}', { assertFormats: true }).output).toBe("Valid. The data matches the schema.");
    expect(runJsonSchemaValidator("{}", '{"required":["id"]}', { assertFormats: true }).output).toBe('Invalid: 1 problem\n\n/  [required]  missing required property "id"');
  });
  it("reports parse errors and unsupported keywords", () => {
    expect(runJsonSchemaValidator("{", "{}", { assertFormats: true }).error?.message).toContain("Data is not valid JSON");
    expect(runJsonSchemaValidator("{}", '{"$ref":"https://x/y.json"}', { assertFormats: true }).error?.message).toContain("Only local $ref");
    expect(runJsonSchemaValidator("{}", '{"unevaluatedProperties":false}', { assertFormats: true }).output).toContain("unevaluatedProperties is not evaluated");
  });
});
