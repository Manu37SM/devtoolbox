import { describe, expect, it } from "vitest";
import { findReplace } from "./transform";

const base = { find: "", replace: "", useRegex: false, caseSensitive: false, wholeWord: false };

describe("findReplace", () => {
  it("replaces every occurrence, case-insensitively by default", () => {
    expect(findReplace("Cat cat CAT", { ...base, find: "cat", replace: "dog" }).output).toBe("dog dog dog");
  });

  it("respects case sensitivity and whole-word", () => {
    expect(findReplace("Cat cat", { ...base, find: "cat", replace: "x", caseSensitive: true }).output).toBe("Cat x");
    expect(findReplace("cat concat cat.", { ...base, find: "cat", replace: "x", wholeWord: true }).output).toBe("x concat x.");
  });

  it("treats the pattern and replacement literally unless regex mode is on", () => {
    expect(findReplace("a.b a-b", { ...base, find: ".", replace: "$&$&" }).output).toBe("a$&$&b a-b");
  });

  it("supports capture groups in regex mode", () => {
    expect(findReplace("2026-10-27", { ...base, find: "(\\d+)-(\\d+)-(\\d+)", replace: "$3/$2/$1", useRegex: true }).output).toBe("27/10/2026");
  });

  it("anchors per line in regex mode", () => {
    expect(findReplace("a\nb", { ...base, find: "^", replace: "> ", useRegex: true }).output).toBe("> a\n> b");
  });

  it("reports invalid regexes", () => {
    expect(findReplace("x", { ...base, find: "(", useRegex: true }).error?.message).toMatch(/Invalid regular expression/);
  });

  it("returns the input untouched when there is nothing to find", () => {
    expect(findReplace("keep", base).output).toBe("keep");
  });
});
