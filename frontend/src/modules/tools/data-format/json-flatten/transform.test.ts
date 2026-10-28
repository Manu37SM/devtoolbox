import { describe, expect, it } from "vitest";
import { flatten, runJsonFlatten, unflatten } from "./transform";

const nested = { a: { b: 1, c: [10, { d: 2 }] }, e: [], f: {}, g: null, h: "x" };

describe("flatten / unflatten", () => {
  it("flattens with bracket arrays", () => {
    expect(flatten(nested as never, ".", "brackets")).toEqual({ "a.b": 1, "a.c[0]": 10, "a.c[1].d": 2, e: [], f: {}, g: null, h: "x" });
  });
  it("flattens with delimited arrays and a custom delimiter", () => {
    expect(flatten({ a: [1, [2]] } as never, "/", "delimited")).toEqual({ "a/0": 1, "a/1/0": 2 });
  });
  it("round-trips in both array styles", () => {
    for (const style of ["brackets", "delimited"] as const) {
      expect(unflatten(flatten(nested as never, ".", style), ".", style)).toEqual(nested);
    }
  });
  it("handles top-level arrays and nested array indexes", () => {
    const v = [[1, 2], [3]];
    expect(flatten(v as never, ".", "brackets")).toEqual({ "[0][0]": 1, "[0][1]": 2, "[1][0]": 3 });
    expect(unflatten(flatten(v as never, ".", "brackets"), ".", "brackets")).toEqual(v);
  });
  it("refuses prototype-polluting keys", () => {
    expect(() => unflatten({ "__proto__.x": 1 }, ".", "brackets")).toThrow(/unsafe/);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe("runJsonFlatten", () => {
  const o = { direction: "flatten" as const, delimiter: "." as const, arrays: "brackets" as const, indent: "min" as const };
  it("flattens text", () => {
    expect(runJsonFlatten('{"a":{"b":[1,2]}}', o).output).toBe('{"a.b[0]":1,"a.b[1]":2}');
  });
  it("unflattens text", () => {
    expect(runJsonFlatten('{"a.b[0]":1}', { ...o, direction: "unflatten" }).output).toBe('{"a":{"b":[1]}}');
  });
  it("reports invalid JSON and wrong shape", () => {
    expect(runJsonFlatten("{", o).error?.message).toMatch(/Invalid JSON/);
    expect(runJsonFlatten("[1]", { ...o, direction: "unflatten" }).error?.message).toMatch(/object/);
    expect(runJsonFlatten("", o)).toEqual({ output: "", error: null });
  });
});
