import { describe, expect, it } from "vitest";
import { convertSqlInserts, parseSqlInserts } from "./transform";

const SQL = `-- users dump
INSERT INTO \`app\`.\`users\` (id, name, note, active, created) VALUES
 (1, 'O''Brien', NULL, TRUE, NOW()),
 (2, 'a,b', 'say "hi"', false, '2024-01-01'); /* done */`;

describe("convertSqlInserts", () => {
  it("extracts multi-row inserts with quotes, NULL, booleans and functions", () => {
    const r = convertSqlInserts(SQL, {});
    expect(r.error).toBeNull();
    expect(r.output).toBe(["id,name,note,active,created", "1,O'Brien,,true,NOW()", '2,"a,b","say ""hi""",false,2024-01-01'].join("\n"));
  });
  it("emits typed JSON and honours nullAs", () => {
    const rows = JSON.parse(convertSqlInserts(SQL, { output: "json" }).output);
    expect(rows[0]).toEqual({ id: 1, name: "O'Brien", note: null, active: true, created: "NOW()" });
    expect(convertSqlInserts(SQL, { nullAs: "NULL" }).output).toContain("1,O'Brien,NULL,true");
    expect(JSON.parse(convertSqlInserts(SQL, { output: "json", typedJson: false }).output)[0].id).toBe("1");
  });
  it("keeps big integers as strings", () => {
    const r = JSON.parse(convertSqlInserts("INSERT INTO t (id) VALUES (12345678901234567890)", { output: "json" }).output);
    expect(r[0].id).toBe("12345678901234567890");
  });
  it("handles inserts without a column list and unions differing column lists", () => {
    expect(convertSqlInserts("INSERT INTO t VALUES (1,'a'),(2,'b');", {}).output).toBe("col1,col2\n1,a\n2,b");
    const p = parseSqlInserts("INSERT INTO t (a) VALUES (1); INSERT INTO t (b,a) VALUES (2,3);");
    expect(p.tables[0]!.columns).toEqual(["a", "b"]);
    expect(p.tables[0]!.rows.map((r) => r.map((v) => v.text))).toEqual([["1", ""], ["3", "2"]]);
  });
  it("reads Oracle INSERT ALL and several tables", () => {
    const sql = "INSERT ALL INTO a (x) VALUES (1) INTO b (y) VALUES (TO_DATE('2024-01-02','YYYY-MM-DD')) SELECT 1 FROM DUAL;";
    const r = convertSqlInserts(sql, {});
    expect(r.output).toBe("# a\nx\n1\n\n# b\ny\n\"TO_DATE('2024-01-02','YYYY-MM-DD')\"");
    expect(convertSqlInserts(sql, { table: "B" }).output.split("\n")[0]).toBe("y");
    expect(JSON.parse(convertSqlInserts(sql, { output: "json" }).output).a).toEqual([{ x: 1 }]);
  });
  it("supports backslash escapes only when asked, plus SQL Server [names] and N'' strings", () => {
    const sql = "INSERT INTO t (v) VALUES ('it\\'s'), ('a\\nb');";
    expect(convertSqlInserts(sql, { backslashEscapes: true, output: "json" }).output).toContain("it's");
    expect(convertSqlInserts("INSERT INTO [dbo].[T] ([Name]) VALUES (N'Zoë')", {}).output).toBe("Name\nZoë");
  });
  it("reports malformed SQL with a line number, and missing tables", () => {
    expect(convertSqlInserts("INSERT INTO t (a) VALUES (1, 2);", {}).error?.message).toMatch(/1 values|2 values/);
    expect(convertSqlInserts("INSERT INTO t (a) VALUES ('oops", {}).error?.message).toMatch(/Unterminated/);
    expect(convertSqlInserts("INSERT INTO t (a) VALUES (1)", { table: "z" }).error?.message).toMatch(/Tables: t/);
    expect(convertSqlInserts("SELECT 1", {}).error?.message).toMatch(/No INSERT/);
  });
  it("writes markdown and ignores ; and -- inside strings", () => {
    const r = convertSqlInserts("INSERT INTO t (a) VALUES ('x; -- y');", { output: "markdown" });
    expect(r.output).toBe("| a |\n| --- |\n| x; -- y |");
  });
});
