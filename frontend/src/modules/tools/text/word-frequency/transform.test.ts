import { describe, expect, it } from "vitest";
import { wordFrequency } from "./transform";

const base = { caseSensitive: false, ignoreStopWords: false, minLength: 1, sortBy: "count", topN: 0 } as const;

describe("wordFrequency", () => {
  it("counts case-insensitively and orders by count then alphabet", () => {
    const out = wordFrequency("Apple apple Banana cherry banana apple", base).output.split("\n");
    expect(out[0]).toBe("6 words, 3 unique");
    expect(out[2]).toMatch(/^3\s+50\.0%\s+apple$/);
    expect(out[3]).toMatch(/^2\s+33\.3%\s+banana$/);
  });

  it("can be case sensitive", () => {
    expect(wordFrequency("A a", { ...base, caseSensitive: true }).output).toContain("2 unique");
  });

  it("keeps contractions and hyphenated words together and handles unicode", () => {
    const out = wordFrequency("don't stop, state-of-the-art café café", base).output;
    expect(out).toContain("don't");
    expect(out).toContain("state-of-the-art");
    expect(out).toMatch(/2\s+40\.0%\s+café/);
  });

  it("filters stop words and short words", () => {
    const out = wordFrequency("the cat and the hat", { ...base, ignoreStopWords: true }).output;
    expect(out).toContain("2 words");
    expect(wordFrequency("a bb ccc", { ...base, minLength: 3 }).output).toContain("1 words");
  });

  it("limits to top N and supports alphabetical order", () => {
    const out = wordFrequency("b a c c", { ...base, topN: 2, sortBy: "alpha" }).output;
    expect(out.split("\n").slice(2)).toHaveLength(2);
    expect(out.split("\n")[2]).toMatch(/a$/);
  });

  it("explains an empty result", () => {
    expect(wordFrequency("the and", { ...base, ignoreStopWords: true }).output).toMatch(/No words matched/);
    expect(wordFrequency("  ", base)).toEqual({ output: "", error: null });
  });
});
