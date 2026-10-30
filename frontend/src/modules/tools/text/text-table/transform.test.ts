import { describe, expect, it } from "vitest";
import { convertTable, displayWidth } from "./transform";

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

describe("convertTable options", () => {
  const csv = "Item,Qty,Price\nApple,3,1.50\nKiwi | gold,12,0.25";
  const base = { from: "csv", to: "markdown" } as const;

  it("escapes pipes in Markdown cells and pads/aligns columns", () => {
    expect(convertTable(csv, base).output.split("\n")[3]).toBe("| Kiwi \\| gold | 12 | 0.25 |");
    expect(convertTable(csv, { ...base, align: "auto", padMarkdown: true }).output).toBe(
      [
        "| Item         | Qty | Price |",
        "| ------------ | --: | ----: |",
        "| Apple        |   3 |  1.50 |",
        "| Kiwi \\| gold |  12 |  0.25 |",
      ].join("\n"),
    );
    expect(convertTable("A,B\n1,2", { ...base, align: "center" }).output.split("\n")[1]).toBe("| :-: | :-: |");
  });

  it("round-trips escaped pipes from Markdown", () => {
    expect(convertTable("| a \\| b | c |\n|---|---|", { from: "markdown", to: "csv" }).output).toBe("a | b,c");
  });

  it("supports ASCII border styles and wide characters", () => {
    expect(convertTable("A,B\n1,2", { from: "csv", to: "ascii", asciiStyle: "ascii" }).output).toBe(
      "+---+---+\n| A | B |\n+---+---+\n| 1 | 2 |\n+---+---+",
    );
    expect(convertTable("Name,N\n東京,1\nab,22", { from: "csv", to: "ascii", asciiStyle: "plain", align: "auto" }).output).toBe(
      "Name   N\n----  --\n東京   1\nab    22",
    );
    expect(displayWidth("東京👍é")).toBe(7);
  });

  it("renders HTML, JSON and Jira tables", () => {
    expect(convertTable("A,B\n<1>,2", { from: "csv", to: "html" }).output).toContain("<th>A</th><th>B</th>");
    expect(convertTable("A,B\n<1>,2", { from: "csv", to: "html" }).output).toContain("<td>&lt;1&gt;</td>");
    expect(JSON.parse(convertTable(csv, { from: "csv", to: "json" }).output)[0]).toEqual({ Item: "Apple", Qty: "3", Price: "1.50" });
    expect(JSON.parse(convertTable("1,2", { from: "csv", to: "json", hasHeader: false }).output)).toEqual([["1", "2"]]);
    expect(convertTable("A,B\n1,", { from: "csv", to: "jira" }).output).toBe("|| A || B ||\n| 1 |   |");
  });

  it("handles header-less input and transposes", () => {
    expect(convertTable("1,2", { ...base, hasHeader: false }).output).toBe("| Column 1 | Column 2 |\n| --- | --- |\n| 1 | 2 |");
    expect(convertTable("A,B\n1,2", { from: "csv", to: "csv", transpose: true }).output).toBe("A,1\nB,2");
  });
});

