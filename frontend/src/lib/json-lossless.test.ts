import { describe, expect, it } from "vitest";
import { JsonSyntaxError, findImpreciseNumbers, parseJsonLossless, stringifyJsonLossless, toPlainValue } from "./json-lossless";

const fmt = (text: string, o = {}) => stringifyJsonLossless(parseJsonLossless(text), { indent: 2, ...o });

describe("json-lossless", () => {
  it("keeps large integers and long decimals exactly", () => {
    const src = '{"accountId":12345678901234567890,"rate":0.10000000000000000001,"e":1E+400}';
    expect(fmt(src, { indent: 0 })).toBe(src.replace("1E+400", "1E+400"));
    expect(JSON.stringify(JSON.parse(src))).not.toBe(src); // what JSON.parse would have done
  });

  it("matches JSON.stringify for ordinary documents", () => {
    const src = JSON.stringify({ a: [1, 2, { b: "x\ny\"z" }], c: null, d: true, e: -0.5, f: {}, g: [] });
    expect(fmt(src)).toBe(JSON.stringify(JSON.parse(src), null, 2));
    expect(fmt(src, { indent: "\t" })).toBe(JSON.stringify(JSON.parse(src), null, "\t"));
    expect(fmt(src, { indent: 0 })).toBe(src);
  });

  it("sorts keys, escapes non-ASCII and inlines short arrays on request", () => {
    expect(fmt('{"b":1,"a":"₹ café"}', { sortKeys: true, escapeUnicode: true })).toBe('{\n  "a": "\\u20b9 caf\\u00e9",\n  "b": 1\n}');
    expect(fmt('{"ports":[8080,8443],"deep":[[1]]}', { inlineArraysUpTo: 80 })).toBe('{\n  "ports": [8080, 8443],\n  "deep": [\n    [1]\n  ]\n}');
    expect(fmt(`{"x":[${'"aaaaaaaaaa",'.repeat(9)}"z"]}`, { inlineArraysUpTo: 40 })).toContain('[\n    "aaaaaaaaaa"');
  });

  it("decodes escapes including surrogate pairs", () => {
    expect(toPlainValue(parseJsonLossless('"\\ud83d\\udc4b \\u20b9 \\/"'))).toBe("👋 ₹ /");
  });

  it("reports precise error positions", () => {
    const cases: Array<[string, RegExp]> = [
      ['{"a": }', /Unexpected "}" at line 1, column 7/],
      ['{"a":1,}', /Trailing comma/],
      ["{'a':1}", /property name in double quotes/],
      ['[1 2]', /Expected "," or "]"/],
      ['"abc', /Unterminated string at line 1, column 1/],
      ['{"a":1}\n{"b":2}', /after the end of the JSON value at line 2, column 1/],
      ["01", /after the end/],
      ["", /Empty input/],
    ];
    for (const [src, re] of cases) {
      expect(() => parseJsonLossless(src)).toThrow(JsonSyntaxError);
      expect(() => parseJsonLossless(src)).toThrow(re);
    }
  });

  it("finds numbers that a JS number would change", () => {
    const tree = parseJsonLossless('[12345678901234567890, 9007199254740993, 1152921504606846976, 0.1, 1.50, 1e2, 0.10000000000000000001]');
    expect(findImpreciseNumbers(tree)).toEqual(["12345678901234567890", "9007199254740993", "0.10000000000000000001"]);
  });
});
