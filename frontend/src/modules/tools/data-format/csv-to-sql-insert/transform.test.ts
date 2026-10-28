import { describe, expect, it } from "vitest";
import { csvToInsert, parseCsv } from "./transform";

const o = { dialect: "postgres" as const, delimiter: "," as const, inferTypes: true, emptyAsNull: true, batchSize: 100 };
const csv = "id,name,score,active\n1,Ann,9.5,true\n2,O'Brien,,false";

describe("parseCsv", () => {
  it("keeps empty quoted fields and handles CRLF", () => {
    expect(parseCsv('a,b\r\n"",x', ",")).toEqual([["a", "b"], ["", "x"]]);
  });
});

describe("csvToInsert", () => {
  it("generates a multi-row Postgres insert with escaping, NULLs and types", () => {
    const r = csvToInsert(csv, o);
    expect(r.output).toBe(`INSERT INTO "my_table" ("id", "name", "score", "active") VALUES\n  (1, 'Ann', 9.5, TRUE),\n  (2, 'O''Brien', NULL, FALSE);\n`);
  });
  it("reads the table name line and quotes schema parts per dialect", () => {
    expect(csvToInsert("table: app.users\n" + csv, { ...o, dialect: "mysql" }).output).toContain("INSERT INTO `app`.`users` (`id`");
    expect(csvToInsert("table: hr.emp\na,b\n1,2", { ...o, dialect: "sqlserver" }).output).toContain("INSERT INTO [hr].[emp] ([a], [b])");
  });
  it("uses one statement per row for Oracle and upper-cases identifiers", () => {
    const r = csvToInsert("a,b\n1,x\n2,y", { ...o, dialect: "oracle" }).output;
    expect(r).toBe(`INSERT INTO "MY_TABLE" ("A", "B") VALUES (1, 'x');\nINSERT INTO "MY_TABLE" ("A", "B") VALUES (2, 'y');\n`);
  });
  it("batches rows", () => {
    const r = csvToInsert("a\n1\n2\n3", { ...o, batchSize: 2 }).output;
    expect(r.match(/INSERT INTO/g)).toHaveLength(2);
  });
  it("keeps leading-zero values as strings and can disable inference", () => {
    expect(csvToInsert("zip\n01234", o).output).toContain("'01234'");
    expect(csvToInsert("n\n5", { ...o, inferTypes: false }).output).toContain("'5'");
    expect(csvToInsert("n\n", { ...o, emptyAsNull: false }).error).not.toBeNull();
  });
  it("escapes backslashes for MySQL and prefixes N for SQL Server unicode", () => {
    expect(csvToInsert("p\nC:\\x", { ...o, dialect: "mysql" }).output).toContain("'C:\\\\x'");
    expect(csvToInsert("p\nçé", { ...o, dialect: "sqlserver" }).output).toContain("N'çé'");
  });
  it("supports tab and semicolon delimiters", () => {
    expect(csvToInsert("a\tb\n1\t2", { ...o, delimiter: "tab" }).output).toContain("(1, 2)");
    expect(csvToInsert("a;b\n1;2", { ...o, delimiter: ";" }).output).toContain("(1, 2)");
  });
  it("validates structure", () => {
    expect(csvToInsert("a,b\n1", o).error).toMatchObject({ line: 2 });
    expect(csvToInsert("a,a\n1,2", o).error?.message).toMatch(/Duplicate/);
    expect(csvToInsert("a,\n1,2", o).error?.message).toMatch(/empty column/);
    expect(csvToInsert("a,b", o).error?.message).toMatch(/at least one data row/);
    expect(csvToInsert("", o)).toEqual({ output: "", error: null });
  });
});
