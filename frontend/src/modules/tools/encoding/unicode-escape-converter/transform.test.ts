import { describe, expect, it } from "vitest";
import { convertUnicodeEscape, escapeUnicode, unescapeUnicode } from "./transform";

describe("escapeUnicode", () => {
  it("leaves ASCII alone by default", () => {
    expect(escapeUnicode("café", "js", false)).toBe("caf\\u00E9");
  });

  it("escapes ASCII when asked", () => {
    expect(escapeUnicode("ab", "js", true)).toBe("\\u0061\\u0062");
  });

  it("uses surrogate pairs for astral code points in js format", () => {
    expect(escapeUnicode("😀", "js", false)).toBe("\\uD83D\\uDE00");
  });

  it("supports every other notation", () => {
    expect(escapeUnicode("😀é", "es6", false)).toBe("\\u{1F600}\\u{E9}");
    expect(escapeUnicode("😀é", "codepoint", false)).toBe("U+1F600U+00E9");
    expect(escapeUnicode("😀é", "html-hex", false)).toBe("&#x1F600;&#xE9;");
    expect(escapeUnicode("😀é", "html-dec", false)).toBe("&#128512;&#233;");
  });
});

describe("unescapeUnicode", () => {
  it("handles every notation, mixed together", () => {
    expect(unescapeUnicode("\\u0048\\u{69} U+0021 &#x1F600; &#128512; \\x41")).toBe("Hi ! 😀 😀 A");
  });

  it("joins surrogate-pair escapes into one character", () => {
    expect(unescapeUnicode("\\uD83D\\uDE00")).toBe("😀");
  });

  it("leaves unrelated text and malformed escapes untouched", () => {
    expect(unescapeUnicode("C:\\users\\u12 plain")).toBe("C:\\users\\u12 plain");
  });

  it("rejects code points beyond U+10FFFF", () => {
    expect(() => unescapeUnicode("&#x110000;")).toThrow(/U\+10FFFF/);
    expect(() => unescapeUnicode("&#9999999;")).toThrow();
  });
});

describe("convertUnicodeEscape", () => {
  it("round-trips for every format", () => {
    const text = "naïve 日本語 😀";
    for (const format of ["js", "es6", "codepoint", "html-hex", "html-dec"] as const) {
      const escaped = convertUnicodeEscape(text, { mode: "escape", format, escapeAscii: false }).output;
      expect(convertUnicodeEscape(escaped, { mode: "unescape", format, escapeAscii: false }).output).toBe(text);
    }
  });

  it("surfaces unescape errors instead of throwing", () => {
    const r = convertUnicodeEscape("&#x110000;", { mode: "unescape", format: "js", escapeAscii: false });
    expect(r.error).not.toBeNull();
    expect(r.output).toBe("");
  });

  it("returns empty output for empty input", () => {
    expect(convertUnicodeEscape("", { mode: "escape", format: "js", escapeAscii: false })).toEqual({ output: "", error: null });
  });
});
