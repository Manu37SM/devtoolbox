import { describe, expect, it } from "vitest";
import { formatSql } from "./transform";
import type { SqlFormatterOptions } from "./schema";

const defaultOptions: SqlFormatterOptions = {
  dialect: "sql",
  keywordCase: "upper",
  tabWidth: 2,
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
    expect(result.output).toContain("SELECT 1");
    expect(result.output).toContain("SELECT 2");
  });

  it("handles a large repeated query without throwing", () => {
    const big = Array.from({ length: 200 }, (_, i) => `SELECT ${i} AS n`).join(" UNION ALL ");
    const result = formatSql(big, defaultOptions);
    expect(result.error).toBeNull();
    expect(result.output.length).toBeGreaterThan(0);
  });
});
