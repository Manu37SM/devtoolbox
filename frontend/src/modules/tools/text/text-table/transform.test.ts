import { describe, expect, it } from "vitest";
import { convertTable } from "./transform";

describe("convertTable", () => {
  it("returns empty output for empty input", () => {
    const result = convertTable("", { from: "csv", to: "markdown" });
    expect(result).toEqual({ output: "", error: null });
  });

  it("converts CSV to Markdown", () => {
    const result = convertTable("Name,Age\nAlice,30\nBob,25", { from: "csv", to: "markdown" });
    expect(result.output).toBe("| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |");
  });

  it("converts Markdown to CSV", () => {
    const input = "| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |";
    const result = convertTable(input, { from: "markdown", to: "csv" });
    expect(result.output).toBe("Name,Age\nAlice,30\nBob,25");
  });

  it("converts CSV to TSV", () => {
    const result = convertTable("Name,Age\nAlice,30", { from: "csv", to: "tsv" });
    expect(result.output).toBe("Name\tAge\nAlice\t30");
  });

  it("converts TSV to CSV", () => {
    const result = convertTable("Name\tAge\nAlice\t30", { from: "tsv", to: "csv" });
    expect(result.output).toBe("Name,Age\nAlice,30");
  });

  it("handles quoted CSV cells containing commas", () => {
    const result = convertTable('Name,City\n"Doe, John","New York"', { from: "csv", to: "markdown" });
    expect(result.output).toBe("| Name | City |\n| --- | --- |\n| Doe, John | New York |");
  });

  it("quotes CSV output cells containing commas", () => {
    const result = convertTable("| Name | City |\n| --- | --- |\n| Doe, John | Boston |", {
      from: "markdown",
      to: "csv",
    });
    expect(result.output).toBe('Name,City\n"Doe, John",Boston');
  });

  it("renders an ASCII box table sized to the widest cell per column", () => {
    const result = convertTable("Name,Role\nAl,Engineer\nBo,PM", { from: "csv", to: "ascii" });
    expect(result.output).toBe(
      [
        "┌──────┬──────────┐",
        "│ Name │ Role     │",
        "├──────┼──────────┤",
        "│ Al   │ Engineer │",
        "│ Bo   │ PM       │",
        "└──────┴──────────┘",
      ].join("\n"),
    );
  });

  it("round-trips Markdown -> ASCII -> (contains) same data", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const result = convertTable(md, { from: "markdown", to: "ascii" });
    expect(result.output).toContain("A");
    expect(result.output).toContain("B");
    expect(result.output).toContain("1");
    expect(result.output).toContain("2");
  });

  it("skips the markdown separator row when parsing", () => {
    const result = convertTable("|A|B|\n|---|---|\n|1|2|", { from: "markdown", to: "csv" });
    expect(result.output).toBe("A,B\n1,2");
  });
});
