import { describe, expect, it } from "vitest";
import { analyzeText, smsInfo } from "./transform";

describe("analyzeText", () => {
  it("returns all-zero stats for empty input", () => {
    expect(analyzeText("")).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      sentences: 0,
      paragraphs: 0,
      bytesUtf8: 0,
      readingTimeMinutes: 0,
    });
  });

  it("counts characters, words, and lines", () => {
    const result = analyzeText("Hello world\nSecond line");
    expect(result.words).toBe(4);
    expect(result.lines).toBe(2);
    expect(result.characters).toBe(23);
  });

  it("counts characters excluding whitespace", () => {
    const result = analyzeText("a b c");
    expect(result.charactersNoSpaces).toBe(3);
  });

  it("counts sentences", () => {
    const result = analyzeText("One. Two! Three?");
    expect(result.sentences).toBe(3);
  });

  it("counts paragraphs separated by blank lines", () => {
    const result = analyzeText("Para one.\n\nPara two.\n\nPara three.");
    expect(result.paragraphs).toBe(3);
  });

  it("computes UTF-8 byte size accounting for multi-byte characters", () => {
    const result = analyzeText("café");
    expect(result.bytesUtf8).toBe(5);
  });

  it("estimates reading time from word count", () => {
    const words = Array.from({ length: 400 }, () => "word").join(" ");
    const result = analyzeText(words);
    expect(result.readingTimeMinutes).toBeCloseTo(2, 1);
  });
});

describe("analyzeText options", () => {
  const family = "👨‍👩‍👧 café";
  it("counts graphemes, code points or UTF-16 units", () => {
    expect(analyzeText(family).characters).toBe(10);
    expect(analyzeText(family, { charMode: "graphemes" }).characters).toBe(6);
    expect(analyzeText(family, { charMode: "utf16" }).characters).toBe(13);
    expect(analyzeText(family)).toMatchObject({ graphemes: 6, utf16Units: 13, bytesUtf16: 26, bytesUtf8: 24 });
  });

  it("segments words by locale for languages without spaces", () => {
    expect(analyzeText("我喜欢编程").words).toBe(1);
    expect(analyzeText("我喜欢编程", { wordMode: "locale" }).words).toBeGreaterThan(1);
  });

  it("uses the reading speed and counts unique words", () => {
    const r = analyzeText("the cat and THE dog. the end", { wpm: 100 });
    expect(r.readingTimeMinutes).toBeCloseTo(0.07);
    expect(r.uniqueWords).toBe(5);
    expect(analyzeText("ab\nabcd\nc").longestLine).toBe(4);
  });

  it("checks against a character limit", () => {
    expect(analyzeText("x".repeat(300), { limit: "tweet" }).limit).toEqual({ name: "Post on X (280)", max: 280, used: 300, remaining: -20 });
    expect(analyzeText("hello", { limit: "custom", customLimit: 3 }).limit?.remaining).toBe(-2);
    expect(analyzeText("hello").limit).toBeNull();
  });
});

describe("smsInfo", () => {
  it("splits GSM-7 and UCS-2 messages into segments", () => {
    expect(smsInfo("a".repeat(160))).toEqual({ encoding: "GSM-7", segments: 1, perSegment: 160 });
    expect(smsInfo("a".repeat(161))).toEqual({ encoding: "GSM-7", segments: 2, perSegment: 153 });
    expect(smsInfo("€".repeat(80))).toEqual({ encoding: "GSM-7", segments: 1, perSegment: 160 });
    expect(smsInfo("€".repeat(81))).toEqual({ encoding: "GSM-7", segments: 2, perSegment: 153 });
    expect(smsInfo("नमस्ते")).toEqual({ encoding: "UCS-2", segments: 1, perSegment: 70 });
    expect(smsInfo("é😀".repeat(36))).toMatchObject({ encoding: "UCS-2", segments: 2 });
  });
});

