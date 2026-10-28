import { describe, expect, it } from "vitest";
import { convertJson5, parseJson5, stringifyJson5 } from "./transform";

const o = { direction: "to-json", indent: "2", trailingCommas: false } as const;

describe("parseJson5", () => {
  it("parses JSONC comments and trailing commas", () => {
    expect(parseJson5(`{\n // c\n "a": 1, /* x */ "b": [1,2,],\n}`)).toEqual({ a: 1, b: [1, 2] });
  });
  it("parses JSON5 extras", () => {
    expect(parseJson5(`{ unquoted: 'single', hex: 0xFF, plus: +1, half: .5, neg: -Infinity, nl: "a\\\nb", $k_1: null }`)).toEqual({
      unquoted: "single", hex: 255, plus: 1, half: 0.5, neg: -Infinity, nl: "ab", $k_1: null,
    });
    expect(parseJson5("'\\x41\\u0042'")).toBe("AB");
  });
  it("reports the position of errors", () => {
    expect(() => parseJson5('{\n  "a": ,\n}')).toThrow(/line 2/);
    expect(() => parseJson5("[1 2]")).toThrow(/Expected ',' or '\]'/);
    expect(() => parseJson5("{} x")).toThrow(/after the value/);
    expect(() => parseJson5("/* open")).toThrow(/Unterminated block comment/);
  });
  it("does not allow __proto__ pollution", () => {
    const v = parseJson5('{"__proto__": {"x": 1}}') as Record<string, unknown>;
    expect(Object.getPrototypeOf(v)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe("convertJson5", () => {
  it("emits strict JSON", () => {
    expect(convertJson5("{a:1,'b':[true,],}", o).output).toBe('{\n  "a": 1,\n  "b": [\n    true\n  ]\n}');
    expect(convertJson5("{a:1}", { ...o, indent: "tab" }).output).toBe('{\n\t"a": 1\n}');
  });
  it("returns error info with line/column", () => {
    const r = convertJson5("{\n a: ?\n}", o);
    expect(r.error?.line).toBe(2);
  });
  it("emits JSON5 with unquoted keys and single quotes", () => {
    const r = convertJson5('{"name":"it\'s","my-key":1,"list":[1,2]}', { ...o, direction: "to-json5", indent: "2", trailingCommas: true });
    expect(r.output).toBe(`{\n  name: "it's",\n  'my-key': 1,\n  list: [\n    1,\n    2,\n  ],\n}`);
    expect(parseJson5(r.output)).toEqual({ name: "it's", "my-key": 1, list: [1, 2] });
  });
  it("round-trips through stringify", () => {
    const v = { a: [1, { b: "x'\"y" }], c: "line\nbreak" };
    expect(parseJson5(stringifyJson5(v, "  ", false))).toEqual(v);
  });
});
