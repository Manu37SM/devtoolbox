import { describe, expect, it } from "vitest";
import { runLineTools, wrapLine } from "./transform";

const base = { operation: "number" as const, param: "", param2: "", useRegex: false, ignoreCase: false, width: 80 };
const run = (input: string, o = {}) => runLineTools(input, { ...base, ...o });

describe("runLineTools", () => {
  it("numbers lines with aligned width", () => {
    expect(run("a\nb").output).toBe("1. a\n2. b");
    expect(run("a\nb\nc", { param: "8", param2: ") " }).output).toBe(" 8) a\n 9) b\n10) c");
  });
  it("prefix/suffix, join, split", () => {
    expect(run("a\nb", { operation: "prefix-suffix", param: "- ", param2: ";" }).output).toBe("- a;\n- b;");
    expect(run("a\nb\nc\n", { operation: "join", param: ", " }).output).toBe("a, b, c\n");
    expect(run("a,b\nc", { operation: "split", param: "," }).output).toBe("a\nb\nc");
  });
  it("reverse, trim, blank removal", () => {
    expect(run("1\n2\n3", { operation: "reverse-order" }).output).toBe("3\n2\n1");
    expect(run("  a \n b", { operation: "trim" }).output).toBe("a\nb");
    expect(run("a\n\n  \nb", { operation: "remove-blank" }).output).toBe("a\nb");
  });
  it("filters literal and regex", () => {
    expect(run("a.b\naxb", { operation: "keep-matching", param: "a.b" }).output).toBe("a.b");
    expect(run("a.b\naxb", { operation: "keep-matching", param: "a.b", useRegex: true }).output).toBe("a.b\naxb");
    expect(run("Foo\nbar", { operation: "remove-matching", param: "foo", ignoreCase: true }).output).toBe("bar");
    expect(run("x", { operation: "keep-matching", param: "(", useRegex: true }).error?.message).toMatch(/Invalid regex/);
  });
  it("wrap, indent, dedent, column", () => {
    expect(wrapLine("the quick brown fox", 10)).toEqual(["the quick", "brown fox"]);
    expect(run("the quick brown fox", { operation: "wrap", width: 10 }).output).toBe("the quick\nbrown fox");
    expect(run("a\n\nb", { operation: "indent", param: "4" }).output).toBe("    a\n\n    b");
    expect(run("    a\n      b", { operation: "dedent" }).output).toBe("a\n  b");
    expect(run("a b c\nd e f", { operation: "column", param: "2" }).output).toBe("b\ne");
    expect(run("a,b\nc,d", { operation: "column", param: "2", param2: "," }).output).toBe("b\nd");
  });
  it("preserves CRLF and trailing newline", () => {
    expect(run("a\r\nb\r\n", { operation: "reverse-order" }).output).toBe("b\r\na\r\n");
    expect(run("")).toEqual({ output: "", error: null });
  });
});
