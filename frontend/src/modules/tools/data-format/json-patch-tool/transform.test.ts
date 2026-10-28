import { describe, expect, it } from "vitest";
import { applyPatch, diffJson, parsePointer, runJsonPatch, type PatchOp } from "./transform";

// Examples from RFC 6902 appendix A.
describe("applyPatch (RFC 6902 appendix A)", () => {
  it("A.1 add object member", () => {
    expect(applyPatch({ foo: "bar" }, [{ op: "add", path: "/baz", value: "qux" }])).toEqual({ foo: "bar", baz: "qux" });
  });
  it("A.2 add array element", () => {
    expect(applyPatch({ foo: ["bar", "baz"] }, [{ op: "add", path: "/foo/1", value: "qux" }])).toEqual({ foo: ["bar", "qux", "baz"] });
  });
  it("A.3/A.4 remove", () => {
    expect(applyPatch({ baz: "qux", foo: "bar" }, [{ op: "remove", path: "/baz" }])).toEqual({ foo: "bar" });
    expect(applyPatch({ foo: ["bar", "qux", "baz"] }, [{ op: "remove", path: "/foo/1" }])).toEqual({ foo: ["bar", "baz"] });
  });
  it("A.5 replace", () => {
    expect(applyPatch({ baz: "qux", foo: "bar" }, [{ op: "replace", path: "/baz", value: "boo" }])).toEqual({ baz: "boo", foo: "bar" });
  });
  it("A.6/A.7 move", () => {
    expect(applyPatch({ foo: { bar: "baz", waldo: "fred" }, qux: { corge: "grault" } }, [{ op: "move", from: "/foo/waldo", path: "/qux/thud" }]))
      .toEqual({ foo: { bar: "baz" }, qux: { corge: "grault", thud: "fred" } });
    expect(applyPatch({ foo: ["all", "grass", "cows", "eat"] }, [{ op: "move", from: "/foo/1", path: "/foo/3" }])).toEqual({ foo: ["all", "cows", "eat", "grass"] });
  });
  it("A.8/A.9 test", () => {
    expect(applyPatch({ baz: "qux", foo: ["a", 2, "c"] }, [{ op: "test", path: "/baz", value: "qux" }, { op: "test", path: "/foo/1", value: 2 }])).toEqual({ baz: "qux", foo: ["a", 2, "c"] });
    expect(() => applyPatch({ baz: "qux" }, [{ op: "test", path: "/baz", value: "bar" }])).toThrow(/Test failed/);
  });
  it("A.10 add composite, A.14 tilde escape, A.16 append with -", () => {
    expect(applyPatch({ foo: "bar" }, [{ op: "add", path: "/child", value: { grandchild: {} } }])).toEqual({ foo: "bar", child: { grandchild: {} } });
    expect(applyPatch({ "/": 9, "~1": 10 }, [{ op: "test", path: "/~01", value: 10 }])).toEqual({ "/": 9, "~1": 10 });
    expect(applyPatch({ foo: ["bar"] }, [{ op: "add", path: "/foo/-", value: ["abc", "def"] }])).toEqual({ foo: ["bar", ["abc", "def"]] });
  });
  it("copy and failure cases (A.12, A.15)", () => {
    expect(applyPatch({ a: [1] }, [{ op: "copy", from: "/a/0", path: "/b" }])).toEqual({ a: [1], b: 1 });
    expect(() => applyPatch({ foo: "bar" }, [{ op: "add", path: "/baz/bat", value: "qux" }])).toThrow(/Path not found/);
    expect(() => applyPatch({ a: 1 }, [{ op: "replace", path: "/nope", value: 1 }])).toThrow(/Path not found/);
  });
  it("does not mutate the input", () => {
    const doc = { a: [1, 2] };
    applyPatch(doc, [{ op: "remove", path: "/a/0" }]);
    expect(doc).toEqual({ a: [1, 2] });
  });
  it("pointers", () => { expect(parsePointer("/a~1b/c~0d")).toEqual(["a/b", "c~d"]); expect(() => parsePointer("a")).toThrow(); });
});

describe("diffJson", () => {
  it("round-trips through applyPatch", () => {
    const cases: Array<[unknown, unknown]> = [
      [{ a: 1, b: { c: [1, 2, 3] }, d: "x" }, { a: 2, b: { c: [1, 5] }, e: true }],
      [{ list: [1, 2] }, { list: [1, 2, 3, 4] }],
      [[1, 2, 3, 4], [1]],
      [{ "a/b": 1 }, { "a/b": 2 }],
      [1, "x"],
    ];
    for (const [a, b] of cases) expect(applyPatch(a as never, diffJson(a as never, b as never) as PatchOp[])).toEqual(b);
  });
  it("is empty for equal docs and escapes keys", () => {
    expect(diffJson({ a: 1 }, { a: 1 })).toEqual([]);
    expect(diffJson({ "a/b": 1 }, { "a/b": 2 })).toEqual([{ op: "replace", path: "/a~1b", value: 2 }]);
  });
});

describe("runJsonPatch", () => {
  it("apply and diff modes", () => {
    expect(runJsonPatch('{"a":1}\n---\n[{"op":"add","path":"/b","value":2}]', { mode: "apply", indent: 0 }).output).toBe('{"a":1,"b":2}');
    expect(runJsonPatch('{"a":1}\n---\n{"a":2}', { mode: "diff", indent: 0 }).output).toBe('[{"op":"replace","path":"/a","value":2}]');
  });
  it("errors", () => {
    expect(runJsonPatch('{"a":1}', { mode: "apply", indent: 2 }).error?.message).toMatch(/---/);
    expect(runJsonPatch('{bad}\n---\n[]', { mode: "apply", indent: 2 }).error?.message).toMatch(/First document/);
    expect(runJsonPatch('{}\n---\n{}', { mode: "apply", indent: 2 }).error?.message).toMatch(/array/);
    expect(runJsonPatch('{}\n---\n[{"op":"remove","path":"/x"}]', { mode: "apply", indent: 2 }).error?.message).toMatch(/operation 1/);
  });
});
