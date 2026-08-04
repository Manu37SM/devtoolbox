import { describe, expect, it } from "vitest";
import { runJsonPath } from "./transform";
import type { JsonPathTesterOptions } from "./schema";

const defaultOptions: JsonPathTesterOptions = { expression: "@", indent: 2 };

describe("runJsonPath", () => {
  it("selects a top-level field", () => {
    const result = runJsonPath('{"name":"devtoolbox","version":1}', {
      ...defaultOptions,
      expression: "name",
    });
    expect(result.error).toBeNull();
    expect(result.output).toBe('"devtoolbox"');
  });

  it("selects a nested field", () => {
    const result = runJsonPath('{"user":{"profile":{"age":30}}}', {
      ...defaultOptions,
      expression: "user.profile.age",
    });
    expect(result.error).toBeNull();
    expect(result.output).toBe("30");
  });

  it("filters an array with a projection expression", () => {
    const json = JSON.stringify({ items: [{ id: 1, active: true }, { id: 2, active: false }] });
    const result = runJsonPath(json, { ...defaultOptions, expression: "items[?active].id" });
    expect(result.error).toBeNull();
    expect(JSON.parse(result.output)).toEqual([1]);
  });

  it("returns null output when the expression matches nothing", () => {
    const result = runJsonPath('{"a":1}', { ...defaultOptions, expression: "missing.path" });
    expect(result.error).toBeNull();
    expect(result.output).toBe("null");
  });

  it("returns empty output for empty input without error", () => {
    const result = runJsonPath("   ", defaultOptions);
    expect(result).toEqual({ output: "", error: null });
  });

  it("returns a structured error for malformed JSON", () => {
    const result = runJsonPath("{not valid", defaultOptions);
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("returns an error for an invalid JMESPath expression", () => {
    const result = runJsonPath('{"a":1}', { ...defaultOptions, expression: "a[?bad syntax" });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("returns an error when the expression is blank", () => {
    const result = runJsonPath('{"a":1}', { ...defaultOptions, expression: "   " });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("respects the indent option", () => {
    const result = runJsonPath('{"a":{"b":1}}', { expression: "a", indent: 4 });
    expect(result.output).toBe('{\n    "b": 1\n}');
  });

  it("supports the identity expression to echo the whole document", () => {
    const result = runJsonPath('{"a":1}', { ...defaultOptions, expression: "@" });
    expect(JSON.parse(result.output)).toEqual({ a: 1 });
  });
});
