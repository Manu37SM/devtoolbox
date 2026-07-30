import { describe, expect, it } from "vitest";
import { diffText, diffTokenStats } from "./transform";

const base = { mode: "line" as const, ignoreWhitespace: false, ignoreCase: false };

describe("diffText — line mode", () => {
  it("finds no diff for identical text", () => {
    const ops = diffText("a\nb\nc", "a\nb\nc", base);
    expect(ops).toEqual([{ type: "equal", value: "a\nb\nc" }]);
  });

  it("detects an added line", () => {
    const ops = diffText("a\nb", "a\nb\nc", base);
    expect(ops).toEqual([
      { type: "equal", value: "a\nb" },
      { type: "add", value: "c" },
    ]);
  });

  it("detects a removed line", () => {
    const ops = diffText("a\nb\nc", "a\nc", base);
    expect(ops).toEqual([
      { type: "equal", value: "a" },
      { type: "remove", value: "b" },
      { type: "equal", value: "c" },
    ]);
  });

  it("detects a changed line as remove+add", () => {
    const ops = diffText("hello", "world", base);
    expect(ops).toEqual([
      { type: "remove", value: "hello" },
      { type: "add", value: "world" },
    ]);
  });

  it("ignores case when requested", () => {
    const ops = diffText("Hello", "hello", { ...base, ignoreCase: true });
    expect(ops).toEqual([{ type: "equal", value: "Hello" }]);
  });

  it("ignores leading/trailing whitespace when requested", () => {
    const ops = diffText("  hi  ", "hi", { ...base, ignoreWhitespace: true });
    expect(ops).toEqual([{ type: "equal", value: "  hi  " }]);
  });
});

describe("diffText — word mode", () => {
  it("diffs at the word level", () => {
    const ops = diffText("the quick fox", "the slow fox", { ...base, mode: "word" });
    expect(ops.filter((o) => o.type !== "equal")).toEqual([
      { type: "remove", value: "quick" },
      { type: "add", value: "slow" },
    ]);
  });
});

describe("diffText — char mode", () => {
  it("diffs at the character level", () => {
    const ops = diffText("cat", "car", { ...base, mode: "char" });
    expect(ops).toEqual([
      { type: "equal", value: "ca" },
      { type: "remove", value: "t" },
      { type: "add", value: "r" },
    ]);
  });
});

describe("diffTokenStats", () => {
  it("counts additions and removals per token", () => {
    const stats = diffTokenStats("a\nb\nc", "a\nx\nc", base);
    expect(stats).toEqual({ additions: 1, removals: 1, unchanged: 2 });
  });

  it("returns all-unchanged for identical input", () => {
    const stats = diffTokenStats("a\nb", "a\nb", base);
    expect(stats).toEqual({ additions: 0, removals: 0, unchanged: 2 });
  });
});
