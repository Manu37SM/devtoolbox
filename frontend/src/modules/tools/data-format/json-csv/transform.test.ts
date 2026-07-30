import { describe, expect, it } from "vitest";
import { convertJsonCsv } from "./transform";

const base = { mode: "json-to-csv" as const, delimiter: "," as const, flattenNested: true };

describe("convertJsonCsv", () => {
  it("converts a flat JSON array to CSV", () => {
    const result = convertJsonCsv(JSON.stringify([{ a: 1, b: "x" }, { a: 2, b: "y" }]), base);
    expect(result.error).toBeNull();
    expect(result.output).toBe("a,b\n1,x\n2,y");
  });

  it("flattens nested objects with dot notation", () => {
    const result = convertJsonCsv(JSON.stringify([{ a: 1, nested: { b: 2 } }]), base);
    expect(result.output).toBe("a,nested.b\n1,2");
  });

  it("quotes fields containing the delimiter, quotes, or newlines", () => {
    const result = convertJsonCsv(JSON.stringify([{ a: 'has,comma', b: 'has"quote' }]), base);
    expect(result.output).toBe('a,b\n"has,comma","has""quote"');
  });

  it("errors when JSON input is not an array", () => {
    const result = convertJsonCsv(JSON.stringify({ a: 1 }), base);
    expect(result.error).not.toBeNull();
  });

  it("converts CSV back to JSON", () => {
    const result = convertJsonCsv("a,b\n1,x\n2,y", { ...base, mode: "csv-to-json" });
    expect(JSON.parse(result.output)).toEqual([
      { a: "1", b: "x" },
      { a: "2", b: "y" },
    ]);
  });

  it("handles quoted CSV fields with embedded commas and escaped quotes", () => {
    const result = convertJsonCsv('a,b\n"has,comma","has ""quote"""', { ...base, mode: "csv-to-json" });
    expect(JSON.parse(result.output)).toEqual([{ a: "has,comma", b: 'has "quote"' }]);
  });

  it("supports a custom delimiter", () => {
    const result = convertJsonCsv(JSON.stringify([{ a: 1, b: 2 }]), { ...base, delimiter: ";" });
    expect(result.output).toBe("a;b\n1;2");
  });

  it("returns empty output for empty input", () => {
    expect(convertJsonCsv("", base)).toEqual({ output: "", error: null });
  });

  it("round-trips JSON -> CSV -> JSON", () => {
    const original = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
    const csv = convertJsonCsv(JSON.stringify(original), base);
    const backToJson = convertJsonCsv(csv.output, { ...base, mode: "csv-to-json" });
    expect(JSON.parse(backToJson.output)).toEqual([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);
  });
});
