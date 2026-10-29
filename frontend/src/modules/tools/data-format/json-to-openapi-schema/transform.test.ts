/* eslint-disable @typescript-eslint/no-explicit-any -- parsed YAML/AST shapes are asserted structurally in tests */
import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { detectFormat, mergeObjects, runJsonToOpenapiSchema } from "./transform";
import type { JsonToOpenapiSchemaOptions } from "./schema";

const base: JsonToOpenapiSchemaOptions = { version: "3.1", output: "schema", format: "yaml", method: "post", includeExamples: true };
const run = (s: string, o: Partial<JsonToOpenapiSchemaOptions> = {}) => runJsonToOpenapiSchema(s, { ...base, ...o });
const SAMPLE = `name: Order
{"id": 3000000000, "email": "a@b.co", "total": 12.5, "placedAt": "2024-01-31T10:00:00Z", "note": null,
 "items": [{"sku": "A1", "qty": 2}, {"sku": "B2", "qty": 1, "gift": true}], "tags": ["x"]}`;

describe("helpers", () => {
  it("detects string formats", () => {
    expect(detectFormat("2024-01-31")).toBe("date");
    expect(detectFormat("2024-01-31T10:00:00+05:30")).toBe("date-time");
    expect(detectFormat("3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e")).toBe("uuid");
    expect(detectFormat("https://x.io/a")).toBe("uri");
    expect(detectFormat("hello")).toBeUndefined();
  });
  it("merges array element keys", () => {
    expect(mergeObjects([{ a: null }, { a: 1, b: 2 }])).toEqual({ a: 1, b: 2 });
  });
});

describe("runJsonToOpenapiSchema", () => {
  it("builds 3.1 component schemas with refs, formats, required and examples", () => {
    const doc = load(run(SAMPLE).output) as any;
    const order = doc.components.schemas.Order;
    expect(order.required).toEqual(["id", "email", "total", "placedAt", "items", "tags"]);
    expect(order.properties.id).toEqual({ type: "integer", format: "int64", examples: [3000000000] });
    expect(order.properties.email).toEqual({ type: "string", format: "email", examples: ["a@b.co"] });
    expect(order.properties.note).toEqual({ type: ["string", "null"], description: "Inferred from a null sample" });
    expect(order.properties.items).toEqual({ type: "array", items: { $ref: "#/components/schemas/Item" } });
    expect(order.properties.tags).toEqual({ type: "array", items: { type: "string" } });
    expect(doc.components.schemas.Item).toEqual({ type: "object", required: ["sku", "qty"], properties: { sku: { type: "string", examples: ["A1"] }, qty: { type: "integer", format: "int32", examples: [2] }, gift: { type: "boolean", examples: [true] } } });
  });
  it("uses nullable and example for 3.0", () => {
    const doc = load(run(SAMPLE, { version: "3.0" }).output) as any;
    expect(doc.components.schemas.Order.properties.note).toEqual({ type: "string", nullable: true, description: "Inferred from a null sample" });
    expect(doc.components.schemas.Order.properties.total).toEqual({ type: "number", format: "double", example: 12.5 });
  });
  it("wraps everything in a path spec", () => {
    const doc = JSON.parse(run(SAMPLE.replace("name: Order", "name: Order\npath: /v1/orders"), { output: "spec", format: "json", includeExamples: false }).output);
    expect(doc.openapi).toBe("3.1.0");
    const op = doc.paths["/v1/orders"].post;
    expect(op.requestBody.content["application/json"].schema).toEqual({ $ref: "#/components/schemas/Order" });
    expect(op.responses["201"].description).toBe("Created");
    expect(doc.components.schemas.Order.properties.id).toEqual({ type: "integer", format: "int64" });
  });
  it("derives a default path from the name and supports GET", () => {
    const doc = load(run('name: User\n{"id":1}', { output: "spec", method: "get" }).output) as any;
    expect(Object.keys(doc.paths)).toEqual(["/users"]);
    expect(doc.paths["/users"].get.requestBody).toBeUndefined();
  });
  it("reports invalid JSON", () => {
    expect(run("{oops").error?.message).toContain("Invalid JSON");
  });
});
