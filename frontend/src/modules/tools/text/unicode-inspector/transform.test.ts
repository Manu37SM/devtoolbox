import { describe, expect, it } from "vitest";
import { categoryOf, escapeForms, inspectUnicode, isInvisible, utf8Bytes } from "./transform";

describe("helpers", () => {
  it("classifies characters", () => {
    expect(categoryOf("A").code).toBe("Lu");
    expect(categoryOf("é").code).toBe("Ll");
    expect(categoryOf("5").code).toBe("Nd");
    expect(categoryOf("€").code).toBe("Sc");
    expect(categoryOf("​").code).toBe("Cf");
    expect(categoryOf(" ").code).toBe("Zs");
    expect(categoryOf("😀").code).toBe("So");
  });
  it("gives UTF-8 bytes and escape forms", () => {
    expect(utf8Bytes(0x20ac)).toBe("E2 82 AC");
    expect(utf8Bytes(0x1f600)).toBe("F0 9F 98 80");
    expect(escapeForms(0x1f600)).toContain("\\uD83D\\uDE00");
    expect(escapeForms(0x1f600)).toContain("\\U0001F600");
    expect(escapeForms(0x41)).toContain("&#x41; / &#65;");
  });
  it("flags invisible characters but not normal whitespace", () => {
    expect(isInvisible("​", 0x200b)).toBe(true);
    expect(isInvisible(" ", 0xa0)).toBe(true);
    expect(isInvisible(" ", 0x20)).toBe(false);
    expect(isInvisible("a", 0x61)).toBe(false);
  });
});

describe("inspectUnicode", () => {
  it("table mode counts code points vs UTF-16 units vs bytes", () => {
    const r = inspectUnicode("a😀", { mode: "table" });
    expect(r.output).toContain("2 code points, 3 UTF-16 units, 5 UTF-8 bytes");
    expect(r.output).toContain("U+1F600");
    expect(r.output).toContain("D83D DE00");
  });
  it("invisible mode finds zero-width chars and trailing whitespace", () => {
    const r = inspectUnicode("ab​c \nok here", { mode: "invisible" });
    expect(r.output).toContain("line 1, col 3: U+200B ZERO WIDTH SPACE");
    expect(r.output).toContain("line 2, col 3: U+00A0 NO-BREAK SPACE");
    expect(r.output).toContain("Trailing whitespace on line(s): 1");
    expect(r.output).toContain("ab⟦200B⟧c");
    expect(inspectUnicode("clean text", { mode: "invisible" }).output).toContain("No invisible");
  });
  it("escapes mode lists each character", () => {
    expect(inspectUnicode("é", { mode: "escapes" }).output).toContain("CSS \\E9");
  });
});
