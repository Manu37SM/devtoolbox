import { describe, expect, it } from "vitest";
import { formatJson } from "./transform";
import type { JsonFormatterOptions } from "./schema";

const defaultOptions: JsonFormatterOptions = {
  indent: 2,
  sortKeys: false,
  mode: "beautify",
  escapeUnicode: false,
  inlineShortArrays: false,
};

describe("formatJson", () => {
  it("beautifies valid JSON with the requested indent", () => {
    const result = formatJson('{"b":1,"a":2}', defaultOptions);
    expect(result.error).toBeNull();
    expect(result.output).toBe('{\n  "b": 1,\n  "a": 2\n}');
  });

  it("minifies valid JSON", () => {
    const result = formatJson('{\n  "a": 1\n}', { ...defaultOptions, mode: "minify" });
    expect(result.error).toBeNull();
    expect(result.output).toBe('{"a":1}');
  });

  it("sorts keys when requested", () => {
    const result = formatJson('{"b":1,"a":2}', { ...defaultOptions, sortKeys: true });
    expect(result.output).toBe('{\n  "a": 2,\n  "b": 1\n}');
  });

  it("supports tab indentation", () => {
    const result = formatJson('{"a":1}', { ...defaultOptions, indent: "tab" });
    expect(result.output).toBe('{\n\t"a": 1\n}');
  });

  it("returns empty output for empty input without error", () => {
    const result = formatJson("   ", defaultOptions);
    expect(result).toEqual({ output: "", error: null });
  });

  it("returns a structured error for malformed JSON", () => {
    const result = formatJson('{"a": }', defaultOptions);
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBeTruthy();
  });

  it("handles large nested structures", () => {
    const nested = { list: Array.from({ length: 1000 }, (_, i) => ({ i })) };
    const result = formatJson(JSON.stringify(nested), defaultOptions);
    expect(result.error).toBeNull();
    expect(JSON.parse(result.output)).toEqual(nested);
  });

  it("keeps 64-bit integers and long decimals exactly", () => {
    const result = formatJson('{"accountId":12345678901234567890,"amount":1234.5600}', defaultOptions);
    expect(result.output).toBe('{\n  "accountId": 12345678901234567890,\n  "amount": 1234.5600\n}');
  });

  it("escapes non-ASCII characters on request", () => {
    expect(formatJson('{"city":"Pune ₹"}', { ...defaultOptions, escapeUnicode: true }).output).toBe('{\n  "city": "Pune \\u20b9"\n}');
  });

  it("keeps short arrays of plain values on one line on request", () => {
    expect(formatJson('{"ports":[80,443],"items":[{"a":1}]}', { ...defaultOptions, inlineShortArrays: true }).output).toBe(
      '{\n  "ports": [80, 443],\n  "items": [\n    {\n      "a": 1\n    }\n  ]\n}',
    );
  });

  it("reports the line and column of syntax errors", () => {
    expect(formatJson('{\n  "a": 1,\n}', defaultOptions).error).toMatchObject({ line: 3, column: 1 });
  });

  it("treats options saved before these settings existed as the defaults", () => {
    const legacy = { indent: 2, sortKeys: false, mode: "beautify" } as JsonFormatterOptions;
    expect(formatJson('{"a":"é"}', legacy).output).toBe('{\n  "a": "é"\n}');
  });
});
