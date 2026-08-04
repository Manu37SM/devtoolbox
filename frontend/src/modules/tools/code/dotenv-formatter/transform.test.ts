import { describe, expect, it } from "vitest";
import { formatDotenv, parseDotenv } from "./transform";
import type { DotenvFormatterOptions } from "./schema";

const base: DotenvFormatterOptions = {
  sortKeys: false,
  removeComments: false,
  removeEmptyLines: false,
  quoteValues: "preserve",
};

describe("parseDotenv", () => {
  it("parses simple KEY=value pairs", () => {
    const { lines, warnings } = parseDotenv("PORT=3000\nNAME=devtoolbox");
    expect(lines).toEqual([
      { type: "entry", key: "PORT", value: "3000", quote: null, exportPrefix: false },
      { type: "entry", key: "NAME", value: "devtoolbox", quote: null, exportPrefix: false },
    ]);
    expect(warnings).toEqual([]);
  });

  it("parses quoted values and preserves the quote style", () => {
    const { lines } = parseDotenv(`GREETING="hello world"\nSINGLE='ok'`);
    expect(lines).toEqual([
      { type: "entry", key: "GREETING", value: "hello world", quote: '"', exportPrefix: false },
      { type: "entry", key: "SINGLE", value: "ok", quote: "'", exportPrefix: false },
    ]);
  });

  it("handles the export prefix", () => {
    const { lines } = parseDotenv("export PATH=/usr/bin");
    expect(lines).toEqual([{ type: "entry", key: "PATH", value: "/usr/bin", quote: null, exportPrefix: true }]);
  });

  it("keeps comments and blank lines", () => {
    const { lines } = parseDotenv("# a comment\n\nKEY=value");
    expect(lines).toEqual([
      { type: "comment", raw: "# a comment" },
      { type: "blank" },
      { type: "entry", key: "KEY", value: "value", quote: null, exportPrefix: false },
    ]);
  });

  it("flags lines without = as warnings and drops them", () => {
    const { lines, warnings } = parseDotenv("not_a_valid_line\nKEY=value");
    expect(lines).toEqual([{ type: "entry", key: "KEY", value: "value", quote: null, exportPrefix: false }]);
    expect(warnings).toEqual([`Line 1: missing "=" — skipped ("not_a_valid_line")`]);
  });

  it("flags duplicate keys as warnings but keeps both entries", () => {
    const { lines, warnings } = parseDotenv("PORT=3000\nPORT=4000");
    expect(lines).toHaveLength(2);
    expect(warnings).toEqual([`Line 2: duplicate key "PORT" (first defined at line 1)`]);
  });

  it("flags invalid key names and drops them", () => {
    const { lines, warnings } = parseDotenv("1INVALID=x");
    expect(lines).toEqual([]);
    expect(warnings).toEqual([`Line 1: invalid key name "1INVALID" — skipped`]);
  });
});

describe("formatDotenv", () => {
  it("formats a well-formed file unchanged by default", () => {
    const result = formatDotenv("PORT=3000\nNAME=devtoolbox", base);
    expect(result.output).toBe("PORT=3000\nNAME=devtoolbox");
    expect(result.warnings).toEqual([]);
  });

  it("sorts keys alphabetically when requested", () => {
    const result = formatDotenv("B=2\nA=1\nC=3", { ...base, sortKeys: true });
    expect(result.output).toBe("A=1\nB=2\nC=3");
  });

  it("removes comments when requested", () => {
    const result = formatDotenv("# note\nKEY=value", { ...base, removeComments: true });
    expect(result.output).toBe("KEY=value");
  });

  it("removes empty lines when requested", () => {
    const result = formatDotenv("KEY=value\n\nOTHER=x", { ...base, removeEmptyLines: true });
    expect(result.output).toBe("KEY=value\nOTHER=x");
  });

  it('quotes all values when quoteValues is "always"', () => {
    const result = formatDotenv("KEY=value", { ...base, quoteValues: "always" });
    expect(result.output).toBe('KEY="value"');
  });

  it('strips quotes when quoteValues is "never"', () => {
    const result = formatDotenv('KEY="value"', { ...base, quoteValues: "never" });
    expect(result.output).toBe("KEY=value");
  });

  it("auto-quotes an unquoted value containing whitespace even in preserve mode", () => {
    const result = formatDotenv("KEY=hello world", base);
    expect(result.output).toBe('KEY="hello world"');
  });

  it("preserves the export prefix when formatting", () => {
    const result = formatDotenv("export PATH=/usr/bin", base);
    expect(result.output).toBe("export PATH=/usr/bin");
  });

  it("does not error on malformed input, only warns", () => {
    const result = formatDotenv("garbage line\nKEY=value", base);
    expect(result.error).toBeNull();
    expect(result.output).toBe("KEY=value");
    expect(result.warnings.length).toBe(1);
  });
});
