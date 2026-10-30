import { describe, expect, it } from "vitest";
import { generateJsonSchema } from "./transform";
import type { JsonSchemaGeneratorOptions } from "./schema";

const defaultOptions: JsonSchemaGeneratorOptions = { allRequired: true, draft: "draft-07" as const, detectFormats: false, forbidAdditional: false, includeExamples: false };

describe("generateJsonSchema", () => {
  it("infers a schema for a flat object", () => {
    const result = generateJsonSchema('{"name":"a","age":30,"active":true}', defaultOptions);
    expect(result.error).toBeNull();
    const schema = JSON.parse(result.output);
    expect(schema.type).toBe("object");
    expect(schema.properties.name).toEqual({ type: "string" });
    expect(schema.properties.age).toEqual({ type: "integer" });
    expect(schema.properties.active).toEqual({ type: "boolean" });
  });

  it("marks all fields as required by default", () => {
    const result = generateJsonSchema('{"a":1,"b":2}', defaultOptions);
    const schema = JSON.parse(result.output);
    expect(schema.required).toEqual(["a", "b"]);
  });

  it("omits required when allRequired is false", () => {
    const result = generateJsonSchema('{"a":1}', { ...defaultOptions, allRequired: false });
    const schema = JSON.parse(result.output);
    expect(schema.required).toBeUndefined();
  });

  it("infers nested object schemas recursively", () => {
    const result = generateJsonSchema('{"user":{"id":1,"email":"a@b.com"}}', defaultOptions);
    const schema = JSON.parse(result.output);
    expect(schema.properties.user.type).toBe("object");
    expect(schema.properties.user.properties.id).toEqual({ type: "integer" });
    expect(schema.properties.user.required).toEqual(["id", "email"]);
  });

  it("infers array item schema from the first element", () => {
    const result = generateJsonSchema('{"items":[{"id":1},{"id":2}]}', defaultOptions);
    const schema = JSON.parse(result.output);
    expect(schema.properties.items.type).toBe("array");
    expect(schema.properties.items.items.type).toBe("object");
    expect(schema.properties.items.items.properties.id).toEqual({ type: "integer" });
  });

  it("handles an empty array with no items key", () => {
    const result = generateJsonSchema('{"list":[]}', defaultOptions);
    const schema = JSON.parse(result.output);
    expect(schema.properties.list).toEqual({ type: "array" });
  });

  it("distinguishes number from integer", () => {
    const result = generateJsonSchema('{"price":9.99,"count":5}', defaultOptions);
    const schema = JSON.parse(result.output);
    expect(schema.properties.price).toEqual({ type: "number" });
    expect(schema.properties.count).toEqual({ type: "integer" });
  });

  it("handles null values", () => {
    const result = generateJsonSchema('{"middleName":null}', defaultOptions);
    const schema = JSON.parse(result.output);
    expect(schema.properties.middleName).toEqual({ type: "null" });
  });

  it("returns empty output for empty input without error", () => {
    const result = generateJsonSchema("   ", defaultOptions);
    expect(result).toEqual({ output: "", error: null });
  });

  it("returns a structured error for malformed JSON", () => {
    const result = generateJsonSchema("{not valid", defaultOptions);
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("infers a schema for a top-level array", () => {
    const result = generateJsonSchema("[1,2,3]", defaultOptions);
    const schema = JSON.parse(result.output);
    expect(schema.type).toBe("array");
    expect(schema.items).toEqual({ type: "integer" });
  });

  it("includes the draft-07 $schema keyword", () => {
    const result = generateJsonSchema('{"a":1}', defaultOptions);
    const schema = JSON.parse(result.output);
    expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
  });

  it("merges every array element: optional keys, nullable and mixed numeric types", () => {
    const schema = JSON.parse(generateJsonSchema('[{"id":1,"name":"a","score":1},{"id":2,"nick":null,"score":2.5,"name":null}]', defaultOptions).output);
    expect(schema.items.required).toEqual(["id", "name", "score"]);
    expect(schema.items.properties.name).toEqual({ type: ["string", "null"] });
    expect(schema.items.properties.score).toEqual({ type: "number" });
    expect(schema.items.properties.nick).toEqual({ type: "null" });
  });

  it("uses the selected draft, detects formats and forbids extra properties", () => {
    const schema = JSON.parse(
      generateJsonSchema('{"at":"2024-01-31T10:00:00Z","email":"a@b.in","id":"3f2504e0-4f89-11d3-9a0c-0305e82c3301","ip":"10.0.0.1","site":"https://x.io"}', {
        ...defaultOptions,
        draft: "2020-12",
        detectFormats: true,
        forbidAdditional: true,
      }).output,
    );
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, (v as { format: string }).format]))).toEqual({
      at: "date-time",
      email: "email",
      id: "uuid",
      ip: "ipv4",
      site: "uri",
    });
    expect(schema.additionalProperties).toBe(false);
  });

  it("adds examples on request", () => {
    const schema = JSON.parse(generateJsonSchema('{"currency":"INR"}', { ...defaultOptions, includeExamples: true }).output);
    expect(schema.properties.currency).toEqual({ type: "string", examples: ["INR"] });
  });
});

