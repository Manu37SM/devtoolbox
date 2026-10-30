import { describe, expect, it } from "vitest";
import { diffJson } from "./transform";
import type { JsonDiffOptions } from "./schema";

const defaultOptions: JsonDiffOptions = { ignoreArrayOrder: false, ignorePaths: "", ignoreCase: false, numericTolerance: 0, output: "summary" as const };

describe("diffJson", () => {
  it("detects a changed scalar field", () => {
    const result = diffJson('{"user":{"age":30}}', '{"user":{"age":31}}', defaultOptions);
    expect(result.error).toBeNull();
    expect(result.diffs).toMatchObject([{ path: "user.age", type: "changed", before: 30, after: 31 }]);
    expect(result.output).toContain("~ user.age: 30 → 31");
  });

  it("detects an added field", () => {
    const result = diffJson('{"user":{}}', '{"user":{"email":"a@b.com"}}', defaultOptions);
    expect(result.diffs).toMatchObject([{ path: "user.email", type: "added", after: "a@b.com" }]);
    expect(result.output).toContain('+ user.email: "a@b.com"');
  });

  it("detects a removed field", () => {
    const result = diffJson('{"user":{"temp":true}}', '{"user":{}}', defaultOptions);
    expect(result.diffs).toMatchObject([{ path: "user.temp", type: "removed", before: true }]);
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
    const result = diffJson("[1,2,3]", "[3,2,1]", { ...defaultOptions, ignoreArrayOrder: true });
    expect(result.diffs).toEqual([]);
  });

  it("handles arrays of different lengths", () => {
    const result = diffJson("[1,2]", "[1,2,3]", defaultOptions);
    expect(result.diffs).toMatchObject([{ path: "[2]", type: "added", after: 3 }]);
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
    expect(result.diffs).toMatchObject([{ path: "a", type: "changed", before: { b: 1 }, after: 5 }]);
  });

  it("handles deeply nested changes across multiple keys", () => {
    const before = { a: 1, b: { c: 2, d: [1, 2] } };
    const after = { a: 1, b: { c: 3, d: [1, 2, 3] } };
    const result = diffJson(JSON.stringify(before), JSON.stringify(after), defaultOptions);
    expect(result.diffs).toEqual(
      expect.arrayContaining([
        { path: "b.c", pointer: "/b/c", type: "changed", before: 2, after: 3 },
        { path: "b.d[2]", pointer: "/b/d/2", type: "added", after: 3 },
      ]),
    );
  });

  it("treats different 64-bit numbers as different and equal digits as equal", () => {
    expect(diffJson('{"acct":12345678901234567890}', '{"acct":12345678901234567891}', defaultOptions).output).toBe(
      "~ acct: 12345678901234567890 → 12345678901234567891",
    );
    expect(diffJson('{"amt":1.50,"id":9007199254740993}', '{"amt":1.5,"id":9007199254740993}', defaultOptions).output).toBe("No differences found.");
  });

  it("ignores listed keys at any depth and wildcard paths", () => {
    const before = '{"id":1,"updatedAt":"a","meta":{"requestId":"x","v":1},"items":[{"etag":"1","n":1}]}';
    const after = '{"id":1,"updatedAt":"b","meta":{"requestId":"y","v":1},"items":[{"etag":"2","n":1}]}';
    expect(diffJson(before, after, { ...defaultOptions, ignorePaths: "updatedAt, meta.requestId\nitems[*].etag" }).output).toBe("No differences found.");
    expect(diffJson(before, after, { ...defaultOptions, ignorePaths: "updatedAt" }).diffs.map((d) => d.path)).toEqual(["items[0].etag", "meta.requestId"]);
  });

  it("applies case-insensitive and tolerant comparisons", () => {
    expect(diffJson('{"s":"ACTIVE","n":100.1}', '{"s":"active","n":100.1000001}', { ...defaultOptions, ignoreCase: true, numericTolerance: 0.001 }).diffs).toEqual([]);
  });

  it("emits an RFC 6902 patch with escaped pointers and safe removal order", () => {
    const r = diffJson('{"a/b":1,"list":[1,2,3],"gone":true}', '{"a/b":2,"list":[1],"new":"x"}', { ...defaultOptions, output: "patch" });
    expect(JSON.parse(r.output)).toEqual([
      { op: "replace", path: "/a~1b", value: 2 },
      { op: "remove", path: "/gone" },
      { op: "add", path: "/new", value: "x" },
      { op: "remove", path: "/list/2" },
      { op: "remove", path: "/list/1" },
    ]);
  });
});

