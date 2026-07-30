import { describe, expect, it } from "vitest";
import { convertJsonYaml } from "./transform";

describe("convertJsonYaml", () => {
  it("converts JSON to YAML", () => {
    const result = convertJsonYaml('{"a":1,"b":["x","z"]}', { mode: "json-to-yaml", indent: 2 });
    expect(result.error).toBeNull();
    expect(result.output).toBe("a: 1\nb:\n  - x\n  - z\n");
  });

  it("converts YAML to JSON", () => {
    const result = convertJsonYaml("a: 1\nb:\n  - x\n  - y\n", { mode: "yaml-to-json", indent: 2 });
    expect(result.error).toBeNull();
    expect(JSON.parse(result.output)).toEqual({ a: 1, b: ["x", "y"] });
  });

  it("round-trips nested structures", () => {
    const original = { name: "test", nested: { list: [1, 2, 3], flag: true } };
    const toYaml = convertJsonYaml(JSON.stringify(original), { mode: "json-to-yaml", indent: 2 });
    const backToJson = convertJsonYaml(toYaml.output, { mode: "yaml-to-json", indent: 2 });
    expect(JSON.parse(backToJson.output)).toEqual(original);
  });

  it("returns empty output for empty input", () => {
    expect(convertJsonYaml("", { mode: "json-to-yaml", indent: 2 })).toEqual({
      output: "",
      error: null,
    });
  });

  it("errors on malformed JSON when converting to YAML", () => {
    const result = convertJsonYaml('{"a":}', { mode: "json-to-yaml", indent: 2 });
    expect(result.error).not.toBeNull();
  });

  it("errors on malformed YAML when converting to JSON", () => {
    const result = convertJsonYaml("a: [1, 2\n", { mode: "yaml-to-json", indent: 2 });
    expect(result.error).not.toBeNull();
  });

  it("supports 4-space indent for YAML output", () => {
    const result = convertJsonYaml('{"a":{"b":1}}', { mode: "json-to-yaml", indent: 4 });
    expect(result.output).toBe("a:\n    b: 1\n");
  });
});
