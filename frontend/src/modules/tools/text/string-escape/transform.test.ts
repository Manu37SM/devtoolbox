import { describe, expect, it } from "vitest";
import { convertStringEscape } from "./transform";

const run = (input: string, language: string, mode: "escape" | "unescape" = "escape") =>
  convertStringEscape(input, { mode, language } as never);

describe("json", () => {
  it("escapes without surrounding quotes and round-trips", () => {
    expect(run('a "b"\n\tc\\', "json").output).toBe('a \\"b\\"\\n\\tc\\\\');
    expect(run(run('é "x"\n', "json").output, "json", "unescape").output).toBe('é "x"\n');
  });
  it("reports invalid escapes on unescape", () => {
    expect(run("bad \\q", "json", "unescape").error).not.toBeNull();
  });
});

describe("javascript", () => {
  it("escapes both quote types, control chars and line separators", () => {
    expect(run(`it's "x"\u2028\0`, "javascript").output).toBe(`it\\'s \\"x\\"\\u2028\\0`);
  });
  it("unescapes \\n \\xHH \\uHHHH \\u{…} and line continuations", () => {
    expect(run("a\\n\\x41\\u0042\\u{1F600}\\\nz", "javascript", "unescape").output).toBe("a\nAB😀z");
  });
  it("rejects code points beyond Unicode", () => {
    expect(run("\\u{110000}", "javascript", "unescape").error).not.toBeNull();
  });
});

describe("java", () => {
  it("only escapes double quotes and turns non-ASCII into \\uXXXX", () => {
    expect(run(`it's "é"`, "java").output).toBe(`it's \\"\\u00E9\\"`);
  });
});

describe("sql", () => {
  it("doubles single quotes both ways", () => {
    expect(run("O'Brien", "sql").output).toBe("O''Brien");
    expect(run("O''Brien", "sql", "unescape").output).toBe("O'Brien");
  });
});

describe("regex", () => {
  it("escapes metacharacters and unescapes them", () => {
    expect(run("a.b*c(d)[e]", "regex").output).toBe("a\\.b\\*c\\(d\\)\\[e\\]");
    expect(run("a\\.b\\*", "regex", "unescape").output).toBe("a.b*");
  });
  it("produces a pattern that matches the literal text", () => {
    const text = "1+1=2? (yes) $5 ^_^ [x] {y} a|b \\ /";
    expect(new RegExp(`^${run(text, "regex").output}$`).test(text)).toBe(true);
  });
});

describe("csv", () => {
  it("quotes only when needed and doubles quotes", () => {
    expect(run("plain", "csv").output).toBe("plain");
    expect(run('a,"b"', "csv").output).toBe('"a,""b"""');
    expect(run('"a,""b"""', "csv", "unescape").output).toBe('a,"b"');
  });
});

describe("shell", () => {
  it("single-quotes with the '\\'' idiom", () => {
    expect(run("it's $HOME", "shell").output).toBe(`'it'\\''s $HOME'`);
    expect(run(`'it'\\''s $HOME'`, "shell", "unescape").output).toBe("it's $HOME");
  });
});

it("empty input gives empty output", () => {
  expect(run("", "json")).toEqual({ output: "", error: null });
});
