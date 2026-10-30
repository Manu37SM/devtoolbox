import { describe, expect, it } from "vitest";
import { convertJsonYaml } from "./transform";

describe("convertJsonYaml", () => {
  it("converts JSON to YAML", () => {
    const result = convertJsonYaml('{"a":1,"b":["x","z"]}', { mode: "json-to-yaml", indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    expect(result.error).toBeNull();
    expect(result.output).toBe("a: 1\nb:\n  - x\n  - z\n");
  });

  it("converts YAML to JSON", () => {
    const result = convertJsonYaml("a: 1\nb:\n  - x\n  - y\n", { mode: "yaml-to-json", indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    expect(result.error).toBeNull();
    expect(JSON.parse(result.output)).toEqual({ a: 1, b: ["x", "y"] });
  });

  it("round-trips nested structures", () => {
    const original = { name: "test", nested: { list: [1, 2, 3], flag: true } };
    const toYaml = convertJsonYaml(JSON.stringify(original), { mode: "json-to-yaml", indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    const backToJson = convertJsonYaml(toYaml.output, { mode: "yaml-to-json", indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    expect(JSON.parse(backToJson.output)).toEqual(original);
  });

  it("returns empty output for empty input", () => {
    expect(convertJsonYaml("", { mode: "json-to-yaml", indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true })).toEqual({
      output: "",
      error: null,
    });
  });

  it("errors on malformed JSON when converting to YAML", () => {
    const result = convertJsonYaml('{"a":}', { mode: "json-to-yaml", indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    expect(result.error).not.toBeNull();
  });

  it("errors on malformed YAML when converting to JSON", () => {
    const result = convertJsonYaml("a: [1, 2\n", { mode: "yaml-to-json", indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    expect(result.error).not.toBeNull();
  });

  it("supports 4-space indent for YAML output", () => {
    const result = convertJsonYaml('{"a":{"b":1}}', { mode: "json-to-yaml", indent: 4, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    expect(result.output).toBe("a:\n    b: 1\n");
  });

  const j2y = { mode: "json-to-yaml" as const, indent: 2 as const, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true };

  it("keeps 64-bit integers and exact decimals when converting to YAML", () => {
    const r = convertJsonYaml('{"accountId":12345678901234567890,"amount":10.50,"count":3}', j2y);
    expect(r.output).toBe("accountId: 12345678901234567890\namount: 10.50\ncount: 3\n");
  });

  it("sorts keys, forces quotes and uses compact sequences on request", () => {
    expect(convertJsonYaml('{"b":["x"],"a":"y"}', { ...j2y, sortKeys: true, quoteStyle: "double", indentSequences: false }).output).toBe(
      'a: "y"\nb:\n- "x"\n',
    );
    expect(convertJsonYaml('{"a":"y"}', { ...j2y, quoteStyle: "single" }).output).toBe("a: 'y'\n");
  });

  it("sorts keys when converting YAML to JSON", () => {
    expect(convertJsonYaml("b: 1\na: 2\n", { ...j2y, mode: "yaml-to-json", sortKeys: true }).output).toBe('{\n  "a": 2,\n  "b": 1\n}');
  });
});
