import { describe, expect, it } from "vitest";
import { diffJson } from "./transform";
import type { JsonDiffOptions } from "./schema";

const defaultOptions: JsonDiffOptions = { ignoreArrayOrder: false };

describe("diffJson", () => {
  it("detects a changed scalar field", () => {
    const result = diffJson('{"user":{"age":30}}', '{"user":{"age":31}}', defaultOptions);
    expect(result.error).toBeNull();
    expect(result.diffs).toEqual([{ path: "user.age", type: "changed", before: 30, after: 31 }]);
    expect(result.output).toContain("~ user.age: 30 → 31");
  });

  it("detects an added field", () => {
    const result = diffJson('{"user":{}}', '{"user":{"email":"a@b.com"}}', defaultOptions);
    expect(result.diffs).toEqual([{ path: "user.email", type: "added", after: "a@b.com" }]);
    expect(result.output).toContain('+ user.email: "a@b.com"');
  });

  it("detects a removed field", () => {
    const result = diffJson('{"user":{"temp":true}}', '{"user":{}}', defaultOptions);
    expect(result.diffs).toEqual([{ path: "user.temp", type: "removed", before: true }]);
    expect(result.output).toContain("- user.temp");
  });

  it("returns no differences for identical documents", () => {
    const result = diffJson('{"a":1,"b":[1,2,3]}', '{"a":1,"b":[1,2,3]}', defaultOptions);
    expect(result.diffs).toEqual([]);
    expect(result.output).toBe("No differences found.");
  });

  it("diffs array elements by index by default", () => {
    const result = diffJson("[1,2,3]", "[1,3,2]", defaultOptions);
    expect(result.diffs.length).toBeGreaterThan(0);
  });

  it("ignores array order for primitive arrays when the option is set", () => {
    const result = diffJson("[1,2,3]", "[3,2,1]", { ignoreArrayOrder: true });
    expect(result.diffs).toEqual([]);
  });

  it("handles arrays of different lengths", () => {
    const result = diffJson("[1,2]", "[1,2,3]", defaultOptions);
    expect(result.diffs).toEqual([{ path: "[2]", type: "added", after: 3 }]);
  });

  it("returns an error for invalid before JSON", () => {
    const result = diffJson("{invalid", "{}", defaultOptions);
    expect(result.error?.message).toContain("Before");
  });

  it("returns an error for invalid after JSON", () => {
    const result = diffJson("{}", "{invalid", defaultOptions);
    expect(result.error?.message).toContain("After");
  });

  it("returns empty output when both inputs are empty", () => {
    const result = diffJson("   ", "   ", defaultOptions);
    expect(result).toEqual({ output: "", diffs: [], error: null });
  });

  it("detects a type change from object to primitive as changed", () => {
    const result = diffJson('{"a":{"b":1}}', '{"a":5}', defaultOptions);
    expect(result.diffs).toEqual([{ path: "a", type: "changed", before: { b: 1 }, after: 5 }]);
  });

  it("handles deeply nested changes across multiple keys", () => {
    const before = { a: 1, b: { c: 2, d: [1, 2] } };
    const after = { a: 1, b: { c: 3, d: [1, 2, 3] } };
    const result = diffJson(JSON.stringify(before), JSON.stringify(after), defaultOptions);
    expect(result.diffs).toEqual(
      expect.arrayContaining([
        { path: "b.c", type: "changed", before: 2, after: 3 },
        { path: "b.d[2]", type: "added", after: 3 },
      ]),
    );
  });
});
