import { describe, expect, it } from "vitest";
import { columnExtractor, parseColumnSpec } from "./transform";

const run = (i: string, o: Parameters<typeof columnExtractor>[1]) => columnExtractor(i, o);

describe("columnExtractor (expected values from awk and cut)", () => {
  it("matches awk '{print $3,$1}' on ragged whitespace", () => {
    expect(run("  a b  c d\nx y z\n", { columns: "3,1" }).output).toBe("c a\nz x");
  });
  it("matches cut -d, -f2-3, omitting missing columns like cut", () => {
    expect(run("a,b,c,d\n1,2\n", { split: "comma", columns: "2-3", missing: "omit" }).output).toBe("b,c\n2");
    expect(run("a,b,c,d\n1,2\n", { split: "comma", columns: "2-3" }).output).toBe("b,c\n2,");
    expect(run("a,b,c,d\n1,2\n", { split: "comma", columns: "2-3", missing: "skip-line" }).output).toBe("b,c");
  });
  it("matches cut -c2-4", () => {
    expect(run("abcdef\n", { split: "chars", columns: "2-4" }).output).toBe("bcd");
  });
  it("matches awk $NF and $(NF-1) with ~1 and ~2", () => {
    expect(run("a b c\n", { columns: "~1,~2" }).output).toBe("c b");
  });
  it("supports open and leading ranges and reversed ranges", () => {
    expect(run("1 2 3 4 5", { columns: "3-" }).output).toBe("3 4 5");
    expect(run("1 2 3 4 5", { columns: "-2" }).output).toBe("1 2");
    expect(run("1 2 3 4 5", { columns: "~2-~1" }).output).toBe("4 5");
    expect(run("1 2 3 4 5", { columns: "4-2" }).output).toBe("4 3 2");
  });
  it("drops columns", () => {
    expect(run("a b c d", { columns: "2,~1", mode: "drop" }).output).toBe("a c");
  });
  it("changes the output separator", () => {
    expect(run("a b c", { columns: "1-3", outputSeparator: "comma" }).output).toBe("a,b,c");
    expect(run("a:b:c", { split: "colon", columns: "1,3", outputSeparator: "custom", outputCustom: " | " }).output).toBe("a | c");
  });
  it("respects quotes only when asked", () => {
    expect(run('a,"b,c",d', { split: "comma", columns: "2" }).output).toBe('"b');
    expect(run('a,"b,c",d', { split: "comma", columns: "2", respectQuotes: true }).output).toBe("b,c");
  });
  it("splits on a regex and a custom delimiter", () => {
    expect(run("a1b22c", { split: "regex", delimiterText: "\\d+", columns: "1,3" }).output).toBe("a\tc");
    expect(run("a::b::c", { split: "custom", delimiterText: "::", columns: "2" }).output).toBe("b");
  });
  it("skips lines, empty lines and duplicates", () => {
    expect(run("h1 h2\n\nx 1\nx 2\ny 3", { skipLines: 1, columns: "1", deduplicate: true }).output).toBe("x\ny");
  });
  it("reports bad specs and settings", () => {
    expect(() => parseColumnSpec("0")).toThrow(/start at 1/);
    expect(run("a", { columns: "abc" }).error?.message).toMatch(/not a column/);
    expect(run("a", { split: "regex", delimiterText: "(", columns: "1" }).error).not.toBeNull();
    expect(run("a", { split: "custom", columns: "1" }).error?.message).toMatch(/separates/);
  });
});
