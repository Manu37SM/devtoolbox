import { describe, expect, it } from "vitest";
import { detectDelimiter, formatCsv, parseCsv } from "./csv";

describe("csv helpers", () => {
  it("parses quotes, embedded delimiters/newlines and CRLF", () => {
    expect(parseCsv('a,"b,c","d ""q"""\r\n1,2,3\n', ",")).toEqual([["a", "b,c", 'd "q"'], ["1", "2", "3"]]);
    expect(parseCsv('x,"line1\nline2"', ",")).toEqual([["x", "line1\nline2"]]);
    expect(parseCsv("a,b,\n,,", ",")).toEqual([["a", "b", ""], ["", "", ""]]);
    expect(parseCsv("", ",")).toEqual([]);
  });
  it("detects delimiters", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\n1\t2")).toBe("\t");
    expect(detectDelimiter("a|b|c\n1|2|3")).toBe("|");
    expect(detectDelimiter("single")).toBe(",");
  });
  it("round-trips through formatCsv", () => {
    const rows = [["a", 'b,"c"', "x\ny"], ["", " pad ", "z"]];
    expect(parseCsv(formatCsv(rows, ","), ",")).toEqual(rows);
    expect(formatCsv([["a", "b"]], "\t", "\r\n")).toBe("a\tb");
  });
});
