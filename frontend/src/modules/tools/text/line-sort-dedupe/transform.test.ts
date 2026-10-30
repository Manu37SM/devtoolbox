import { describe, expect, it } from "vitest";
import { sortDedupeLines } from "./transform";
import type { LineSortDedupeOptions } from "./schema";

const base: LineSortDedupeOptions = {
  caseSensitive: false,
  column: 0,
  columnDelimiter: "whitespace",
  countOccurrences: false,
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

describe("sortDedupeLines options", () => {
  const o = { sort: "none", dedupe: "none" } as const;
  it("sorts naturally, descending, reversed and by length", () => {
    expect(sortDedupeLines("item10\nitem2\nItem1", { ...o, sort: "natural" }).output).toBe("Item1\nitem2\nitem10");
    expect(sortDedupeLines("item10\nitem2", { ...o, sort: "natural-desc" }).output).toBe("item10\nitem2");
    expect(sortDedupeLines("1,000\n20\n3", { ...o, sort: "numeric-desc" }).output).toBe("1,000\n20\n3");
    expect(sortDedupeLines("a\nccc\nbb", { ...o, sort: "length-desc" }).output).toBe("ccc\nbb\na");
    expect(sortDedupeLines("a\nc\nb", { ...o, sort: "reverse" }).output).toBe("b\nc\na");
  });

  it("sorts case-sensitively in code-point order", () => {
    expect(sortDedupeLines("b\nB\na\nA", { ...o, sort: "alpha", caseSensitive: true }).output).toBe("A\nB\na\nb");
  });

  it("sorts by a column", () => {
    const csv = "bob,30\nann,4\ncid,100";
    expect(sortDedupeLines(csv, { ...o, sort: "numeric", column: 2, columnDelimiter: "," }).output).toBe("ann,4\nbob,30\ncid,100");
    expect(sortDedupeLines("x  b\ny a", { ...o, sort: "alpha", column: 2 }).output).toBe("y a\nx  b");
  });

  it("keeps only unique or only duplicated lines, with counts", () => {
    const s = "a\nb\na\nc\nb\na";
    expect(sortDedupeLines(s, { ...o, dedupe: "unique" }).output).toBe("c");
    expect(sortDedupeLines(s, { ...o, dedupe: "duplicates" }).output).toBe("a\nb");
    expect(sortDedupeLines(s, { ...o, dedupe: "exact", countOccurrences: true }).output).toBe("3 a\n2 b\n1 c");
  });

  it("preserves CRLF line endings and reports line counts", () => {
    const r = sortDedupeLines("b\r\na\r\na", { ...o, sort: "alpha", dedupe: "exact" });
    expect(r.output).toBe("a\r\nb");
    expect(r.stats).toEqual({ input: 3, output: 2 });
  });
});

