import { describe, expect, it } from "vitest";
import { convertCsvTsv } from "./transform";
import type { CsvTsvOptions } from "./schema";

const csvToTsv: CsvTsvOptions = { mode: "csv-to-tsv", csvDelimiter: ",", quoteAll: false, trimFields: false, lineEnding: "lf" };
const tsvToCsv: CsvTsvOptions = { mode: "tsv-to-csv", csvDelimiter: ",", quoteAll: false, trimFields: false, lineEnding: "lf" };
const clean: CsvTsvOptions = { mode: "clean", csvDelimiter: ",", quoteAll: false, trimFields: false, lineEnding: "lf" };

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
    // The line break must stay inside quotes or the TSV gains a bogus row.
    expect(result.output).toBe('name\tbio\nCarl\t"line1\nline2"');
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

  it("quotes fields that contain quotes or line breaks so the output stays valid", () => {
    expect(convertCsvTsv('name\tnote\nAsha\tsays "hi"\n', tsvToCsv).output).toBe('name,note\nAsha,"says ""hi"""');
    expect(convertCsvTsv('a,"line1\nline2"\n', csvToTsv).output).toBe('a\t"line1\nline2"');
  });

  it("reads and writes semicolon CSV, quotes everything and uses CRLF on request", () => {
    const r = convertCsvTsv("id\tamount\n1\t1.234,50\n", { ...tsvToCsv, csvDelimiter: ";", quoteAll: true, lineEnding: "crlf" });
    expect(r.output).toBe('"id";"amount"\r\n"1";"1.234,50"');
    expect(convertCsvTsv("id;amount\n1;1.234,50\n", { ...csvToTsv, csvDelimiter: ";" }).output).toBe("id\tamount\n1\t1.234,50");
  });

  it("trims fields and detects semicolon and pipe delimiters when cleaning", () => {
    expect(convertCsvTsv(" a , b \n 1 , 2 \n", { ...csvToTsv, trimFields: true }).output).toBe("a\tb\n1\t2");
    expect(convertCsvTsv("a;b\n1;2\n\na;b\n", clean).output).toBe("a;b\n1;2");
    expect(convertCsvTsv("a|b\n1|2\n", clean).output).toBe("a|b\n1|2");
  });
});

