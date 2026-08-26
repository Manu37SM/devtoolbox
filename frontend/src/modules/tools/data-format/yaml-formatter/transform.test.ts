import { describe, expect, it } from "vitest";
import { formatYaml } from "./transform";

describe("formatYaml", () => {
  it("normalizes indentation", () => {
    const result = formatYaml("a:\n      1\nb: 2\n", { indent: 2 });

    expect(result.error).toBeNull();
  });

  it("formats a valid document with the requested indent", () => {
    const result = formatYaml("a:\n  b: 1\n", { indent: 4 });
    expect(result.output).toBe("a:\n    b: 1\n");
  });

  it("returns empty output for empty input", () => {
    expect(formatYaml("", { indent: 2 })).toEqual({ output: "", error: null });
  });

  it("returns a structured error for malformed YAML", () => {
    const result = formatYaml("a: [1, 2\n", { indent: 2 });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBeTruthy();
  });

  it("round-trips lists and nested maps", () => {
    const result = formatYaml("items:\n  - a\n  - b\nmeta:\n  version: 1\n", { indent: 2 });
    expect(result.output).toBe("items:\n  - a\n  - b\nmeta:\n  version: 1\n");
  });
});
