import { describe, expect, it } from "vitest";
import type { JsonSortKeysOptions } from "./schema";
import { runJsonSortKeys, sortJson } from "./transform";

const o: JsonSortKeysOptions = { order: "asc", deep: true, caseInsensitive: false, sortArrays: false, indent: "min" };
const run = (s: string, p: Partial<JsonSortKeysOptions> = {}) => runJsonSortKeys(s, { ...o, ...p }).output;

describe("sortJson", () => {
  it("sorts keys recursively, including inside arrays", () => {
    expect(run('{"b":1,"a":{"d":1,"c":[{"z":1,"y":2}]}}')).toBe('{"a":{"c":[{"y":2,"z":1}],"d":1},"b":1}');
  });
  it("sorts only the top level when deep is off", () => {
    expect(run('{"b":{"y":1,"x":2},"a":1}', { deep: false })).toBe('{"a":1,"b":{"y":1,"x":2}}');
  });
  it("supports descending, length and natural orders", () => {
    expect(run('{"a":1,"c":2,"b":3}', { order: "desc" })).toBe('{"c":2,"b":3,"a":1}');
    expect(run('{"ccc":1,"a":2,"bb":3}', { order: "length" })).toBe('{"a":2,"bb":3,"ccc":1}');
    expect(run('{"item10":1,"item2":2,"item1":3}', { order: "natural" })).toBe('{"item1":3,"item2":2,"item10":1}');
  });
  it("handles case sensitivity (ASCII order puts capitals first)", () => {
    expect(run('{"b":1,"A":2,"a":3,"B":4}')).toBe('{"A":2,"B":4,"a":3,"b":1}');
    expect(Object.keys(JSON.parse(run('{"b":1,"A":2,"a":3}', { caseInsensitive: true })))).toEqual(["A", "a", "b"]);
  });
  it("optionally sorts primitive arrays by type then value", () => {
    expect(run('[3,"b",1,"a",null,true]', { sortArrays: true })).toBe('[null,true,1,3,"a","b"]');
    expect(run("[3,1,2]")).toBe("[3,1,2]");
  });
  it("is safe with __proto__ keys and does not mutate input", () => {
    const src = JSON.parse('{"b":1,"__proto__":{"x":1},"a":2}');
    const r = sortJson(src, o) as Record<string, unknown>;
    expect(Object.keys(r)).toEqual(["__proto__", "a", "b"]);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(Object.keys(src)).toEqual(["b", "__proto__", "a"]);
  });
  it("reports invalid JSON and formats indentation", () => {
    expect(runJsonSortKeys("{", o).error?.message).toMatch(/Invalid JSON/);
    expect(run('{"b":1,"a":2}', { indent: "2" })).toBe('{\n  "a": 2,\n  "b": 1\n}');
    expect(runJsonSortKeys("", o)).toEqual({ output: "", error: null });
  });
});
