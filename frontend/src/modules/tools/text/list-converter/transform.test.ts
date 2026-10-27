import { describe, expect, it } from "vitest";
import { convertList } from "./transform";

const base = {
  mode: "lines-to-list", delimiter: "comma-space", quote: "none", wrapper: "none",
  trim: true, skipEmpty: true, dedupe: false, sort: "none",
} as const;

describe("lines -> list", () => {
  it("joins lines with the chosen delimiter and drops blanks", () => {
    expect(convertList("a\n\n b \nc", base).output).toBe("a, b, c");
    expect(convertList("a\nb", { ...base, delimiter: "pipe" }).output).toBe("a|b");
  });

  it("quotes items; single quotes are SQL-escaped", () => {
    expect(convertList("it's\nok", { ...base, quote: "single" }).output).toBe("'it''s', 'ok'");
    expect(convertList("a\nb", { ...base, quote: "double" }).output).toBe('"a", "b"');
  });

  it("dedupes and sorts (numerically when every item is a number)", () => {
    expect(convertList("b\na\nb", { ...base, dedupe: true, sort: "asc" }).output).toBe("a, b");
    expect(convertList("10\n9\n100", { ...base, sort: "asc" }).output).toBe("9, 10, 100");
    expect(convertList("10\n9\n100", { ...base, sort: "desc" }).output).toBe("100, 10, 9");
  });

  it("wraps as SQL IN, parens, brackets and JSON array", () => {
    expect(convertList("1\n2", { ...base, wrapper: "sql-in" }).output).toBe("(1, 2)");
    expect(convertList("a\nb", { ...base, wrapper: "sql-in", quote: "single" }).output).toBe("('a', 'b')");
    expect(convertList("a\nb", { ...base, wrapper: "brackets", quote: "double" }).output).toBe('["a", "b"]');
    expect(convertList("a\nb", { ...base, wrapper: "json-array" }).output).toBe('["a","b"]');
  });

  it("splits Oracle IN lists over 1000 items and says why", () => {
    const input = Array.from({ length: 1500 }, (_, i) => String(i)).join("\n");
    const out = convertList(input, { ...base, wrapper: "sql-in", delimiter: "comma" }).output;
    expect(out).toContain("ORA-01795");
    expect(out.match(/^\(/gm)).toHaveLength(2);
    expect(out.split("\n").find((l) => l.startsWith("(0,"))!.split(",")).toHaveLength(1000);
  });
});

describe("list -> lines", () => {
  const rev = { ...base, mode: "list-to-lines" } as const;
  it("splits on common delimiters and strips wrappers and quotes", () => {
    expect(convertList("('a', 'it''s', \"b\")", rev).output).toBe("a\nit's\nb");
    expect(convertList("[1, 2; 3|4]", rev).output).toBe("1\n2\n3\n4");
    expect(convertList("x IN (1,2)".replace("x ", ""), rev).output).toBe("1\n2");
  });
});

it("returns empty output for blank input", () => {
  expect(convertList("  ", base)).toEqual({ output: "", error: null });
});
