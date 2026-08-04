import { describe, expect, it } from "vitest";
import { sortDedupeLines } from "./transform";
import type { LineSortDedupeOptions } from "./schema";

const base: LineSortDedupeOptions = {
  sort: "none",
  dedupe: "none",
  trimEmptyLines: false,
  trimWhitespace: false,
};

describe("sortDedupeLines", () => {
  it("returns empty output for empty input", () => {
    const result = sortDedupeLines("", base);
    expect(result).toEqual({ output: "", error: null });
  });

  it("leaves lines unchanged with sort=none, dedupe=none", () => {
    const result = sortDedupeLines("banana\napple\ncherry", base);
    expect(result.output).toBe("banana\napple\ncherry");
  });

  it("sorts alphabetically ascending", () => {
    const result = sortDedupeLines("banana\napple\ncherry", { ...base, sort: "alpha" });
    expect(result.output).toBe("apple\nbanana\ncherry");
  });

  it("sorts alphabetically descending", () => {
    const result = sortDedupeLines("banana\napple\ncherry", { ...base, sort: "alpha-desc" });
    expect(result.output).toBe("cherry\nbanana\napple");
  });

  it("sorts numerically", () => {
    const result = sortDedupeLines("10\n2\n33\n4", { ...base, sort: "numeric" });
    expect(result.output).toBe("2\n4\n10\n33");
  });

  it("sorts by length", () => {
    const result = sortDedupeLines("aaa\na\naa", { ...base, sort: "length" });
    expect(result.output).toBe("a\naa\naaa");
  });

  it("shuffles as a permutation of the original multiset", () => {
    const input = "a\nb\nc\nd\ne";
    const result = sortDedupeLines(input, { ...base, sort: "shuffle" });
    expect(result.output.split("\n").sort()).toEqual(input.split("\n").sort());
  });

  it("dedupes exact duplicates, keeping first occurrence order", () => {
    const result = sortDedupeLines("a\nb\na\nc\nb", { ...base, dedupe: "exact" });
    expect(result.output).toBe("a\nb\nc");
  });

  it("dedupes case-insensitively", () => {
    const result = sortDedupeLines("Apple\napple\nBanana", { ...base, dedupe: "case-insensitive" });
    expect(result.output).toBe("Apple\nBanana");
  });

  it("trims whitespace on each line when requested", () => {
    const result = sortDedupeLines("  a  \n b ", { ...base, trimWhitespace: true });
    expect(result.output).toBe("a\nb");
  });

  it("removes empty lines when requested", () => {
    const result = sortDedupeLines("a\n\n\nb\n  \nc", { ...base, trimEmptyLines: true });
    expect(result.output).toBe("a\nb\nc");
  });

  it("combines trim, dedupe, and sort options", () => {
    const result = sortDedupeLines(
      "banana\n\n Apple \napple\nBANANA\n",
      { sort: "alpha", dedupe: "case-insensitive", trimEmptyLines: true, trimWhitespace: true },
    );
    expect(result.output).toBe("Apple\nbanana");
  });
});
