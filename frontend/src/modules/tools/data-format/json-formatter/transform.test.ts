import { describe, expect, it } from "vitest";
import { formatJson } from "./transform";
import type { JsonFormatterOptions } from "./schema";

const defaultOptions: JsonFormatterOptions = {
  indent: 2,
  sortKeys: false,
  mode: "beautify",
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
});
