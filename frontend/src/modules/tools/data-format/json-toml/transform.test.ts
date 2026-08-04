import { describe, expect, it } from "vitest";
import { convertJsonToml } from "./transform";
import type { JsonTomlOptions } from "./schema";

const defaultOptions: JsonTomlOptions = { mode: "json-to-toml", indent: 2 };

describe("convertJsonToml", () => {
  it("converts a simple JSON object to TOML", () => {
    const result = convertJsonToml('{"name":"devtoolbox","version":1}', defaultOptions);
    expect(result.error).toBeNull();
    expect(result.output).toContain('name = "devtoolbox"');
    expect(result.output).toContain("version = 1");
  });

  it("converts nested JSON objects to TOML tables", () => {
    const result = convertJsonToml('{"server":{"host":"localhost","port":8080}}', defaultOptions);
    expect(result.error).toBeNull();
    expect(result.output).toContain("[server]");
    expect(result.output).toContain('host = "localhost"');
    expect(result.output).toContain("port = 8080");
  });

  it("converts TOML back to JSON", () => {
    const toml = 'name = "devtoolbox"\nversion = 1\n';
    const result = convertJsonToml(toml, { ...defaultOptions, mode: "toml-to-json" });
    expect(result.error).toBeNull();
    expect(JSON.parse(result.output)).toEqual({ name: "devtoolbox", version: 1 });
  });

  it("respects indent option when converting TOML to JSON", () => {
    const toml = "a = 1\n";
    const result = convertJsonToml(toml, { mode: "toml-to-json", indent: 4 });
    expect(result.output).toBe('{\n    "a": 1\n}');
  });

  it("returns empty output for empty input without error", () => {
    const result = convertJsonToml("   ", defaultOptions);
    expect(result).toEqual({ output: "", error: null });
  });

  it("returns an error for invalid JSON input", () => {
    const result = convertJsonToml("{not valid json", defaultOptions);
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("returns an error for invalid TOML input", () => {
    const result = convertJsonToml("this is = = not toml", { ...defaultOptions, mode: "toml-to-json" });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("rejects top-level JSON arrays since TOML requires an object root", () => {
    const result = convertJsonToml("[1,2,3]", defaultOptions);
    expect(result.output).toBe("");
    expect(result.error?.message).toContain("top-level object");
  });

  it("rejects top-level JSON primitives", () => {
    const result = convertJsonToml('"just a string"', defaultOptions);
    expect(result.error).not.toBeNull();
  });

  it("round-trips arrays of tables", () => {
    const json = '{"items":[{"id":1},{"id":2}]}';
    const toJson = convertJsonToml(json, defaultOptions);
    expect(toJson.error).toBeNull();
    const back = convertJsonToml(toJson.output, { ...defaultOptions, mode: "toml-to-json" });
    expect(JSON.parse(back.output)).toEqual({ items: [{ id: 1 }, { id: 2 }] });
  });
});
