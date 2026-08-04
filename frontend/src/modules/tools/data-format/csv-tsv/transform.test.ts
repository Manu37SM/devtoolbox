import { describe, expect, it } from "vitest";
import { convertCsvTsv } from "./transform";
import type { CsvTsvOptions } from "./schema";

const csvToTsv: CsvTsvOptions = { mode: "csv-to-tsv" };
const tsvToCsv: CsvTsvOptions = { mode: "tsv-to-csv" };
const clean: CsvTsvOptions = { mode: "clean" };

describe("convertCsvTsv", () => {
  it("converts simple CSV to TSV", () => {
    const result = convertCsvTsv("a,b,c\n1,2,3", csvToTsv);
    expect(result.error).toBeNull();
    expect(result.output).toBe("a\tb\tc\n1\t2\t3");
  });

  it("converts simple TSV to CSV", () => {
    const result = convertCsvTsv("a\tb\tc\n1\t2\t3", tsvToCsv);
    expect(result.error).toBeNull();
    expect(result.output).toBe("a,b,c\n1,2,3");
  });

  it("handles quoted fields containing the delimiter", () => {
    const result = convertCsvTsv('name,note\nAlice,"hello, world"', csvToTsv);
    expect(result.error).toBeNull();
    expect(result.output).toBe("name\tnote\nAlice\thello, world");
  });

  it("handles escaped double quotes inside quoted fields", () => {
    const result = convertCsvTsv('name,quote\nBob,"she said ""hi"""', csvToTsv);
    expect(result.error).toBeNull();
    expect(result.output).toBe('name\tquote\nBob\tshe said "hi"');
  });

  it("handles quoted fields containing embedded newlines", () => {
    const result = convertCsvTsv('name,bio\nCarl,"line1\nline2"', csvToTsv);
    expect(result.error).toBeNull();
    expect(result.output).toBe("name\tbio\nCarl\tline1\nline2");
  });

  it("quotes TSV->CSV fields that now contain a comma", () => {
    const result = convertCsvTsv("name\tnote\nAlice\thello, world", tsvToCsv);
    expect(result.error).toBeNull();
    expect(result.output).toBe('name,note\nAlice,"hello, world"');
  });

  it("returns empty output for empty input without error", () => {
    const result = convertCsvTsv("   ", csvToTsv);
    expect(result).toEqual({ output: "", error: null });
  });

  it("clean mode trims whitespace from every cell", () => {
    const result = convertCsvTsv("a , b ,c\n 1,2 , 3", clean);
    expect(result.error).toBeNull();
    expect(result.output).toBe("a,b,c\n1,2,3");
  });

  it("clean mode removes fully-empty rows", () => {
    const result = convertCsvTsv("a,b\n1,2\n,\n3,4", clean);
    expect(result.error).toBeNull();
    expect(result.output).toBe("a,b\n1,2\n3,4");
  });

  it("clean mode removes duplicate header rows", () => {
    const result = convertCsvTsv("a,b\n1,2\na,b\n3,4", clean);
    expect(result.error).toBeNull();
    expect(result.output).toBe("a,b\n1,2\n3,4");
  });

  it("clean mode auto-detects TSV input", () => {
    const result = convertCsvTsv("a\tb\n1\t2\n \t \n3\t4", clean);
    expect(result.error).toBeNull();
    expect(result.output).toBe("a\tb\n1\t2\n3\t4");
  });

  it("handles a large input without error", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => `${i},value${i}`).join("\n");
    const result = convertCsvTsv(`id,value\n${rows}`, csvToTsv);
    expect(result.error).toBeNull();
    expect(result.output.split("\n")).toHaveLength(1001);
  });
});
