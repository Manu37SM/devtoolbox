import { describe, expect, it } from "vitest";
import { estimateReading, fmtMinutes } from "./transform";

const o = { wpm: 200, stripMarkdown: false, countImages: false } as const;
const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

describe("fmtMinutes", () => {
  it("formats seconds, minutes and hours", () => {
    expect(fmtMinutes(0.1)).toBe("6 sec");
    expect(fmtMinutes(1)).toBe("1 min");
    expect(fmtMinutes(2.5)).toBe("2 min 30 sec");
    expect(fmtMinutes(135)).toBe("2 h 15 min");
    expect(fmtMinutes(0)).toBe("1 sec");
  });
});

describe("estimateReading", () => {
  it("1000 words at 200 wpm is 5 minutes", () => {
    const out = estimateReading(words(1000), o).output;
    expect(out).toContain("Reading time   5 min");
    expect(out).toContain("Speaking time  6 min 40 sec");
    expect(out).toContain("Words       1000");
  });
  it("counts contractions and hyphenated words as one word", () => {
    expect(estimateReading("Don't over-think it.", o).output).toContain("Words       3");
  });
  it("counts sentences and paragraphs", () => {
    const out = estimateReading("One. Two! Three?\n\nFour.", o).output;
    expect(out).toContain("Sentences   4");
    expect(out).toContain("Paragraphs  2");
  });
  it("strips Markdown syntax and code blocks when asked", () => {
    const md = "# Title\n\n```js\nconst a = 1;\n```\n\nSee [the docs](https://example.com/very/long/url) now.";
    expect(estimateReading(md, { ...o, stripMarkdown: true }).output).toContain("Words       5");
    expect(estimateReading(md, o).output).not.toContain("Words       5");
  });
  it("adds time for images with the diminishing heuristic", () => {
    const text = `${words(200)} ![a](x.png) ![b](y.png)`;
    const out = estimateReading(text, { ...o, countImages: true }).output;
    expect(out).toContain("Images  2");
    expect(out).toContain("1 min 23 sec"); // 60s + 12s + 11s
  });
  it("treats CJK characters as half a word each", () => {
    expect(estimateReading("日本語のテキストです。".repeat(40), { ...o, wpm: 100 }).output).toContain("CJK characters");
  });
  it("handles empty input", () => {
    expect(estimateReading("   ", o)).toEqual({ output: "", error: null });
  });
});
