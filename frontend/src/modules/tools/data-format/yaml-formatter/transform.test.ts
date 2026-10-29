import { describe, expect, it } from "vitest";
import { formatYaml } from "./transform";

describe("formatYaml", () => {
  it("normalizes indentation", () => {
    const result = formatYaml("a:\n      1\nb: 2\n", { indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });

    expect(result.error).toBeNull();
  });

  it("formats a valid document with the requested indent", () => {
    const result = formatYaml("a:\n  b: 1\n", { indent: 4, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    expect(result.output).toBe("a:\n    b: 1\n");
  });

  it("returns empty output for empty input", () => {
    expect(formatYaml("", { indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true })).toEqual({ output: "", error: null });
  });

  it("returns a structured error for malformed YAML", () => {
    const result = formatYaml("a: [1, 2\n", { indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBeTruthy();
  });

  it("round-trips lists and nested maps", () => {
    const result = formatYaml("items:\n  - a\n  - b\nmeta:\n  version: 1\n", { indent: 2, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true });
    expect(result.output).toBe("items:\n  - a\n  - b\nmeta:\n  version: 1\n");
  });

  const base = { indent: 2 as const, sortKeys: false, quoteStyle: "auto" as const, indentSequences: true };

  it("formats every document of a multi-document file", () => {
    const r = formatYaml("kind: A\nmetadata: {name: a}\n---\nkind: B\n", base);
    expect(r.output).toBe("kind: A\nmetadata:\n  name: a\n---\nkind: B\n");
  });

  it("applies sort, quoting and compact sequence options", () => {
    const r = formatYaml("b:\n  - x\na: y\n", { ...base, sortKeys: true, quoteStyle: "double", indentSequences: false });
    expect(r.output).toBe('a: "y"\nb:\n- "x"\n');
  });
});
