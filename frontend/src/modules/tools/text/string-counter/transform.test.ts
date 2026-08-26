import { describe, expect, it } from "vitest";
import { analyzeText } from "./transform";

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
