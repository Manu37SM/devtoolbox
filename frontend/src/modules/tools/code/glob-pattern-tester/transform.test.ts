import { describe, expect, it } from "vitest";
import { compileGlob, compileIgnoreRule, expandBraces, isIgnored, testGlobs } from "./transform";

const g = (p: string, path: string, o: { dot?: boolean; ignoreCase?: boolean } = {}) => compileGlob(p, { dot: o.dot ?? false, ignoreCase: o.ignoreCase ?? false }).test(path);

describe("expandBraces", () => {
  it("expands lists, ranges and nesting", () => {
    expect(expandBraces("*.{js,ts}")).toEqual(["*.js", "*.ts"]);
    expect(expandBraces("f{1..3}")).toEqual(["f1", "f2", "f3"]);
    expect(expandBraces("a{b,c{d,e}}")).toEqual(["ab", "acd", "ace"]);
    expect(expandBraces("{x}")).toEqual(["\\{x\\}"]);
    expect(expandBraces("plain")).toEqual(["plain"]);
  });
});

describe("compileGlob", () => {
  it("star does not cross directories; globstar does", () => {
    expect(g("src/*.ts", "src/a.ts")).toBe(true);
    expect(g("src/*.ts", "src/x/a.ts")).toBe(false);
    expect(g("src/**/*.ts", "src/a.ts")).toBe(true);
    expect(g("src/**/*.ts", "src/x/y/a.ts")).toBe(true);
    expect(g("**/*.md", "README.md")).toBe(true);
    expect(g("src/**", "src/a/b")).toBe(true);
    expect(g("src/**", "other/a")).toBe(false);
  });
  it("supports ?, classes, negated classes and braces", () => {
    expect(g("file?.txt", "file1.txt")).toBe(true);
    expect(g("file?.txt", "file12.txt")).toBe(false);
    expect(g("[abc].js", "b.js")).toBe(true);
    expect(g("[!abc].js", "d.js")).toBe(true);
    expect(g("[!abc].js", "a.js")).toBe(false);
    expect(g("*.{png,jpg}", "x.jpg")).toBe(true);
    expect(g("img{1..3}.png", "img2.png")).toBe(true);
  });
  it("hides dotfiles unless dot is on; escapes regex chars", () => {
    expect(g("*", ".env")).toBe(false);
    expect(g("*", ".env", { dot: true })).toBe(true);
    expect(g("**/*.js", "a/.hidden/x.js")).toBe(false);
    expect(g("**/*.js", "a/.hidden/x.js", { dot: true })).toBe(true);
    expect(g(".*", ".env")).toBe(true);
    expect(g("a+b(1).txt", "a+b(1).txt")).toBe(true);
    expect(g("A.TXT", "a.txt", { ignoreCase: true })).toBe(true);
  });
});

describe("gitignore semantics", () => {
  const rules = ["node_modules/", "*.log", "!keep.log", "/build", "docs/*.tmp"].map((l) => compileIgnoreRule(l, { ignoreCase: false })!);
  it("applies the last matching rule and ignores whole directories", () => {
    expect(isIgnored("node_modules/x/y.js", rules).ignored).toBe(true);
    expect(isIgnored("a/node_modules/x.js", rules).ignored).toBe(true);
    expect(isIgnored("app.log", rules).ignored).toBe(true);
    expect(isIgnored("keep.log", rules).ignored).toBe(false);
    expect(isIgnored("build/out.js", rules).ignored).toBe(true);
    expect(isIgnored("sub/build/out.js", rules).ignored).toBe(false); // anchored
    expect(isIgnored("docs/a.tmp", rules).ignored).toBe(true);
    expect(isIgnored("docs/x/a.tmp", rules).ignored).toBe(false);
    expect(isIgnored("src/main.ts", rules).ignored).toBe(false);
  });
  it("dir-only rules do not match files with the same name", () => {
    expect(isIgnored("node_modules", rules).ignored).toBe(false);
    expect(isIgnored("node_modules/", rules).ignored).toBe(true);
  });
});

describe("testGlobs", () => {
  it("formats results for both modes", () => {
    const glob = testGlobs("src/**/*.ts\n---\nsrc/a.ts\nlib/b.ts", { mode: "glob", dot: false, ignoreCase: false });
    expect(glob.output).toContain("✓ match   ");
    expect(glob.output).toContain("1 of 2 path(s) matched");
    const ign = testGlobs("*.log\n!keep.log\n---\na.log\nkeep.log", { mode: "gitignore", dot: false, ignoreCase: false });
    expect(ign.output).toContain("IGNORED  a.log   ← *.log");
    expect(ign.output).toContain("1 ignored, 1 tracked");
  });
  it("supports ! exclusions in glob mode", () => {
    const r = testGlobs("src/**/*.ts\n!**/*.test.ts\n---\nsrc/a.ts\nsrc/a.test.ts", { mode: "glob", dot: false, ignoreCase: false });
    expect(r.output).toContain("✓ match     src/a.ts");
    expect(r.output).toContain("✗ excluded  src/a.test.ts   ← !**/*.test.ts");
    expect(r.output).toContain("1 of 2 path(s) matched");
  });
  it("explains a missing separator", () => {
    expect(testGlobs("*.ts", { mode: "glob", dot: false, ignoreCase: false }).error?.message).toContain("---");
  });
});
