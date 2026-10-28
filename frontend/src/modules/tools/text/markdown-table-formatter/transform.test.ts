import { describe, expect, it } from "vitest";
import { parseCsv, runMarkdownTable, splitRow } from "./transform";

const o = { source: "markdown" as const, align: "keep" as const, compact: false };

describe("splitRow", () => {
  it("trims cells and respects escaped pipes", () => {
    expect(splitRow("| a | b\\|c |  d |")).toEqual(["a", "b\\|c", "d"]);
    expect(splitRow("a|b")).toEqual(["a", "b"]);
  });
});

describe("parseCsv", () => {
  it("handles quotes, embedded commas, newlines and doubled quotes", () => {
    expect(parseCsv('a,"b,c","d ""q"""\n1,2,3\n', ",")).toEqual([["a", "b,c", 'd "q"'], ["1", "2", "3"]]);
    expect(parseCsv('x,"line1\nline2"', ",")).toEqual([["x", "line1\nline2"]]);
    expect(parseCsv("a\tb\r\nc\td", "\t")).toEqual([["a", "b"], ["c", "d"]]);
    expect(() => parseCsv('a,"b', ",")).toThrow(/Unterminated/);
  });
});

describe("runMarkdownTable", () => {
  it("aligns a messy markdown table and keeps alignment markers", () => {
    const r = runMarkdownTable("|Name|Qty|Note|\n|:--|--:|:-:|\n|apple|10|ok|\n|kiwi|2|a longer note|", o);
    expect(r.output).toBe(
      "| Name  | Qty |     Note      |\n| :---- | --: | :-----------: |\n| apple |  10 |      ok       |\n| kiwi  |   2 | a longer note |\n",
    );
  });
  it("converts CSV and applies forced alignment", () => {
    const r = runMarkdownTable("id,name\n1,Ann\n22,Bob", { ...o, source: "csv", align: "right" });
    expect(r.output).toBe("|  id | name |\n| --: | ---: |\n|   1 |  Ann |\n|  22 |  Bob |\n");
  });
  it("supports compact output and escapes pipes / newlines from CSV", () => {
    const r = runMarkdownTable('a,b\n"x|y","l1\nl2"', { ...o, source: "csv", compact: true });
    expect(r.output).toBe("| a | b |\n| --- | --- |\n| x\\|y | l1<br>l2 |\n");
  });
  it("pads ragged rows and measures wide characters", () => {
    expect(runMarkdownTable("a,b,c\n1", { ...o, source: "csv" }).output.split("\n")[2]).toBe("| 1   |     |     |");
    const w = runMarkdownTable("h\n日本", { ...o, source: "csv" }).output.split("\n");
    expect(w[0]).toBe("| h    |");
    expect(w[2]).toBe("| 日本 |");
  });
  it("validates structure", () => {
    expect(runMarkdownTable("just text", o).error?.line).toBe(1);
    expect(runMarkdownTable("| a | b |\n| x | y |", o).error?.line).toBe(2);
    expect(runMarkdownTable("| a | b |\n| --- |", o).error?.message).toMatch(/columns/);
    expect(runMarkdownTable("| a |", o).error?.message).toMatch(/header row and a delimiter/);
    expect(runMarkdownTable("", o)).toEqual({ output: "", error: null });
  });
});
