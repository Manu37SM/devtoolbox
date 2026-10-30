import { describe, expect, it } from "vitest";
import { formatSql } from "./transform";
import type { SqlFormatterOptions } from "./schema";

const defaultOptions: SqlFormatterOptions = {
  dialect: "sql",
  keywordCase: "upper",
  tabWidth: 2,
  useTabs: false,
  functionCase: "preserve",
  dataTypeCase: "preserve",
  indentStyle: "standard",
  logicalOperatorNewline: "before",
  expressionWidth: 50,
  linesBetweenQueries: 1,
  denseOperators: false,
  newlineBeforeSemicolon: false,
};

describe("formatSql", () => {
  it("beautifies a simple select statement", () => {
    const result = formatSql("select id, name from users where id = 1", defaultOptions);
    expect(result.error).toBeNull();
    expect(result.output).toContain("SELECT");
    expect(result.output).toContain("FROM");
    expect(result.output).toContain("WHERE");
  });

  it("returns empty output for empty input without error", () => {
    const result = formatSql("   ", defaultOptions);
    expect(result).toEqual({ output: "", error: null });
  });

  it("uppercases keywords when keywordCase is upper", () => {
    const result = formatSql("select * from t", { ...defaultOptions, keywordCase: "upper" });
    expect(result.output).toMatch(/SELECT/);
  });

  it("lowercases keywords when keywordCase is lower", () => {
    const result = formatSql("SELECT * FROM t", { ...defaultOptions, keywordCase: "lower" });
    expect(result.output).toMatch(/select/);
    expect(result.output).not.toMatch(/SELECT/);
  });

  it("preserves keyword case when keywordCase is preserve", () => {
    const result = formatSql("SeLeCt * from t", { ...defaultOptions, keywordCase: "preserve" });
    expect(result.output).toContain("SeLeCt");
  });

  it("respects a custom tab width", () => {
    const result = formatSql("SELECT a, b FROM t", { ...defaultOptions, tabWidth: 4 });
    expect(result.error).toBeNull();
    expect(result.output.length).toBeGreaterThan(0);
  });

  it("formats postgresql-dialect specific syntax", () => {
    const result = formatSql("SELECT a::int FROM t", { ...defaultOptions, dialect: "postgresql" });
    expect(result.error).toBeNull();
    expect(result.output).toContain("::");
  });

  it("formats mysql dialect input", () => {
    const result = formatSql("SELECT * FROM t LIMIT 10", { ...defaultOptions, dialect: "mysql" });
    expect(result.error).toBeNull();
    expect(result.output).toContain("LIMIT");
  });

  it("handles multi-statement input", () => {
    const result = formatSql("SELECT 1; SELECT 2;", defaultOptions);
    expect(result.error).toBeNull();

    expect(result.output).toMatch(/SELECT\s+1/);
    expect(result.output).toMatch(/SELECT\s+2/);
    expect(result.output.match(/SELECT/g)).toHaveLength(2);
  });

  it("handles a large repeated query without throwing", () => {
    const big = Array.from({ length: 200 }, (_, i) => `SELECT ${i} AS n`).join(" UNION ALL ");
    const result = formatSql(big, defaultOptions);
    expect(result.error).toBeNull();
    expect(result.output.length).toBeGreaterThan(0);
  });

  it("formats Oracle PL/SQL with bind variables and functions in lower case", () => {
    const r = formatSql("select nvl(a,0) from accounts where id = :id and status='A'", { ...defaultOptions, dialect: "plsql", functionCase: "lower" });
    expect(r.output).toBe("SELECT\n  nvl(a, 0)\nFROM\n  accounts\nWHERE\n  id = :id\n  AND status = 'A'");
  });

  it("supports T-SQL bracket identifiers", () => {
    expect(formatSql("select [order id] from dbo.[orders]", { ...defaultOptions, dialect: "transactsql" }).output).toBe(
      "SELECT\n  [order id]\nFROM\n  dbo.[orders]",
    );
  });

  it("puts AND/OR at the end of lines and uses dense operators on request", () => {
    const r = formatSql("select a from t where x = 1 and y = 2", { ...defaultOptions, logicalOperatorNewline: "after", denseOperators: true });
    expect(r.output).toBe("SELECT\n  a\nFROM\n  t\nWHERE\n  x=1 AND\n  y=2");
  });

  it("aligns clauses in tabular style and indents with tabs", () => {
    expect(formatSql("select a, b from t", { ...defaultOptions, indentStyle: "tabularLeft" }).output).toBe("SELECT    a,\n          b\nFROM      t");
    expect(formatSql("select a from t", { ...defaultOptions, useTabs: true }).output).toBe("SELECT\n\ta\nFROM\n\tt");
  });

  it("controls data type case, blank lines between queries and the semicolon position", () => {
    const r = formatSql("create table t (id number(10)); select 1 from dual;", {
      ...defaultOptions,
      dialect: "plsql",
      dataTypeCase: "upper",
      linesBetweenQueries: 2,
      newlineBeforeSemicolon: true,
    });
    expect(r.output).toBe("CREATE TABLE t (id NUMBER(10))\n;\n\n\nSELECT\n  1\nFROM\n  dual\n;");
  });
});

