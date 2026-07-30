import { describe, expect, it } from "vitest";
import { testRegex, replaceRegex } from "./transform";

const flags = { global: true, ignoreCase: false, multiline: false, dotAll: false, unicode: false };

describe("testRegex", () => {
  it("finds all global matches with their positions", () => {
    const result = testRegex("\\d+", flags, "a1 b22 c333");
    expect(result.error).toBeNull();
    expect(result.matches.map((m) => m.match)).toEqual(["1", "22", "333"]);
    expect(result.matches[0]!.index).toBe(1);
  });

  it("captures numbered groups", () => {
    const result = testRegex("(\\w+)@(\\w+)", flags, "user@host");
    expect(result.matches[0]!.groups).toEqual(["user", "host"]);
  });

  it("captures named groups", () => {
    const result = testRegex("(?<user>\\w+)@(?<host>\\w+)", flags, "user@host");
    expect(result.matches[0]!.namedGroups).toEqual({ user: "user", host: "host" });
  });

  it("respects ignoreCase flag", () => {
    const result = testRegex("hello", { ...flags, ignoreCase: true }, "HELLO world");
    expect(result.matches).toHaveLength(1);
  });

  it("only returns the first match when global is false", () => {
    const result = testRegex("\\d+", { ...flags, global: false }, "a1 b22 c333");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.match).toBe("1");
  });

  it("returns an error for invalid regex syntax", () => {
    const result = testRegex("(unclosed", flags, "text");
    expect(result.error).not.toBeNull();
    expect(result.matches).toEqual([]);
  });

  it("returns empty matches for empty pattern or input", () => {
    expect(testRegex("", flags, "text")).toEqual({ matches: [], error: null });
    expect(testRegex("\\d+", flags, "")).toEqual({ matches: [], error: null });
  });

  it("handles zero-width matches without hanging", () => {
    const result = testRegex("\\b", flags, "hello world");
    expect(result.matches.length).toBeGreaterThan(0);
  });
});

describe("replaceRegex", () => {
  it("replaces matches using $1 group references", () => {
    const result = replaceRegex("(\\w+)@(\\w+)", flags, "user@host", "$2@$1");
    expect(result.output).toBe("host@user");
  });

  it("returns the original input unchanged for an empty pattern", () => {
    const result = replaceRegex("", flags, "hello", "x");
    expect(result.output).toBe("hello");
  });

  it("returns an error for invalid regex syntax", () => {
    const result = replaceRegex("(unclosed", flags, "text", "x");
    expect(result.error).not.toBeNull();
  });
});
