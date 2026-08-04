import { describe, expect, it } from "vitest";
import { diffCode, diffStats, formatUnifiedDiff, generateCodeDiff } from "./transform";
import type { CodeDiffOptions } from "./schema";

const base: CodeDiffOptions = { language: "javascript", ignoreWhitespace: false, ignoreCase: false };

describe("diffCode", () => {
  it("finds no diff for identical code", () => {
    const ops = diffCode("const a = 1;\nconst b = 2;", "const a = 1;\nconst b = 2;", base);
    expect(ops.every((o) => o.type === "equal")).toBe(true);
  });

  it("detects an added line", () => {
    const ops = diffCode("a();\nb();", "a();\nb();\nc();", base);
    expect(ops).toEqual([
      { type: "equal", value: "a();" },
      { type: "equal", value: "b();" },
      { type: "add", value: "c();" },
    ]);
  });

  it("detects a removed line", () => {
    const ops = diffCode("a();\nb();\nc();", "a();\nc();", base);
    expect(ops).toEqual([
      { type: "equal", value: "a();" },
      { type: "remove", value: "b();" },
      { type: "equal", value: "c();" },
    ]);
  });

  it("detects a changed line as remove+add", () => {
    const ops = diffCode("let x = 1;", "let x = 2;", base);
    expect(ops).toEqual([
      { type: "remove", value: "let x = 1;" },
      { type: "add", value: "let x = 2;" },
    ]);
  });

  it("ignores case when requested", () => {
    const ops = diffCode("CONST X = 1;", "const x = 1;", { ...base, ignoreCase: true });
    expect(ops.every((o) => o.type === "equal")).toBe(true);
  });

  it("ignores leading/trailing whitespace when requested", () => {
    const ops = diffCode("  const x = 1;  ", "const x = 1;", { ...base, ignoreWhitespace: true });
    expect(ops.every((o) => o.type === "equal")).toBe(true);
  });
});

describe("diffStats", () => {
  it("counts additions, removals and unchanged lines", () => {
    const ops = diffCode("a\nb\nc", "a\nx\nc", base);
    expect(diffStats(ops)).toEqual({ additions: 1, removals: 1, unchanged: 2 });
  });
});

describe("formatUnifiedDiff", () => {
  it("renders +/-/  prefixed lines", () => {
    const ops = diffCode("a\nb", "a\nc", base);
    expect(formatUnifiedDiff(ops)).toBe("  a\n- b\n+ c");
  });
});

describe("generateCodeDiff", () => {
  it("returns empty output for two empty inputs", () => {
    const result = generateCodeDiff("", "", base);
    expect(result).toEqual({ output: "", ops: [], stats: { additions: 0, removals: 0, unchanged: 0 }, error: null });
  });

  it("builds a full unified-diff output and stats together", () => {
    const result = generateCodeDiff("function f() {\n  return 1;\n}", "function f() {\n  return 2;\n}", base);
    expect(result.error).toBeNull();
    expect(result.output).toBe("  function f() {\n-   return 1;\n+   return 2;\n  }");
    expect(result.stats).toEqual({ additions: 1, removals: 1, unchanged: 2 });
  });

  it("treats added-only content as pure additions", () => {
    const result = generateCodeDiff("", "line one\nline two", base);
    expect(result.stats).toEqual({ additions: 2, removals: 0, unchanged: 0 });
  });
});
