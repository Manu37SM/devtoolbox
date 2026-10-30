import { describe, expect, it } from "vitest";
import { formatTextWrap } from "./transform";

const TEXT = "The quick brown fox jumps over the lazy dog and keeps running far away";

describe("formatTextWrap", () => {
  it("greedy-wraps at the width and never exceeds it", () => {
    const r = formatTextWrap(TEXT, { width: 20, detectPrefix: false });
    const lines = r.output.split("\n");
    expect(lines.length).toBeGreaterThan(3);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(20);
    expect(lines.join(" ")).toBe(TEXT);
  });
  it("reflows a prefixed comment block and keeps the prefix", () => {
    const r = formatTextWrap("// aaa bbb\n// ccc ddd eee fff\n//\n// second paragraph", { width: 16 });
    expect(r.output).toBe("// aaa bbb ccc\n// ddd eee fff\n//\n// second\n// paragraph");
  });
  it("applies an explicit prefix and hanging indent within the width", () => {
    const r = formatTextWrap("one two three four five six", { width: 14, prefix: "> ", firstIndent: 0, hangingIndent: 2, detectPrefix: false });
    for (const l of r.output.split("\n")) {
      expect(l.startsWith("> ")).toBe(true);
      expect(l.length).toBeLessThanOrEqual(14);
    }
    expect(r.output.split("\n")[1]!.startsWith(">   ")).toBe(true);
  });
  it("justifies every line but the last to exactly the inner width", () => {
    const lines = formatTextWrap(TEXT, { width: 24, align: "justify", detectPrefix: false }).output.split("\n");
    for (const l of lines.slice(0, -1)) expect(l.length).toBe(24);
    expect(lines[lines.length - 1]!.length).toBeLessThanOrEqual(24);
  });
  it("right- and centre-aligns", () => {
    expect(formatTextWrap("hi", { width: 10, align: "right" }).output).toBe("        hi");
    expect(formatTextWrap("hi", { width: 10, align: "center" }).output).toBe("    hi");
  });
  it("keeps long words whole unless asked to break them", () => {
    const url = "https://example.com/a/very/long/path/that/does/not/fit";
    expect(formatTextWrap(`see ${url}`, { width: 20 }).output).toContain(url);
    const broken = formatTextWrap(url, { width: 20, breakLongWords: true }).output.split("\n");
    expect(broken.every((l) => l.length <= 20)).toBe(true);
    expect(broken.join("")).toBe(url);
  });
  it("unwraps paragraphs and handles per-line wrapping", () => {
    expect(formatTextWrap("a b\nc d\n\ne f", { mode: "unwrap" }).output).toBe("a b c d\n\ne f");
    expect(formatTextWrap("aa bb cc\ndd", { width: 10, joinLines: false }).output).toBe("aa bb cc\ndd");
  });
  it("preserves CRLF and rejects an oversized prefix", () => {
    expect(formatTextWrap("a b\r\n\r\nc", { width: 20 }).output).toBe("a b\r\n\r\nc");
    expect(formatTextWrap("x", { width: 12, prefix: "0123456789 " }).error?.message).toMatch(/prefix/);
  });
});
