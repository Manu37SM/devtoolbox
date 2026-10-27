import { describe, expect, it } from "vitest";
import { convertJsonToSql, sanitizeIdentifier } from "./transform";

const base = { dialect: "oracle", tableName: "users", includeCreate: true, multiRow: false } as const;
const run = (json: unknown, o = {}) => convertJsonToSql(JSON.stringify(json), { ...base, ...o } as never);

describe("sanitizeIdentifier", () => {
  it("snake-cases, avoids digits-first and reserved words", () => {
    expect(sanitizeIdentifier("userName")).toBe("user_name");
    expect(sanitizeIdentifier("First Name!")).toBe("first_name");
    expect(sanitizeIdentifier("2fa")).toBe("c_2fa");
    expect(sanitizeIdentifier("date")).toBe("date_");
    expect(sanitizeIdentifier("***")).toBe("col");
  });
});

describe("convertJsonToSql", () => {
  const rows = [
    { id: 1, name: "O'Brien", active: true, score: 1.5, meta: { a: 1 } },
    { id: 3_000_000_000, name: "Ann", active: false, score: 2, extra: null },
  ];

  it("creates an Oracle table with widened types", () => {
    const out = run(rows).output;
    expect(out).toContain("id NUMBER(19)");
    expect(out).toContain("name VARCHAR2(50)");
    expect(out).toContain("active NUMBER(1)");
    expect(out).toContain("score NUMBER,");
    expect(out).toContain("meta CLOB");
    expect(out).toContain("extra VARCHAR2(50)");
  });

  it("escapes quotes, maps booleans and NULLs, stringifies nested JSON", () => {
    const out = run(rows).output;
    expect(out).toContain(`INSERT INTO users (id, name, active, score, meta, extra) VALUES (1, 'O''Brien', 1, 1.5, '{"a":1}', NULL);`);
    expect(out).toContain("(3000000000, 'Ann', 0, 2, NULL, NULL);");
  });

  it("uses dialect-specific types and literals", () => {
    expect(run(rows, { dialect: "postgres" }).output).toContain("active BOOLEAN");
    expect(run(rows, { dialect: "postgres" }).output).toContain("meta JSONB");
    expect(run(rows, { dialect: "postgres" }).output).toContain("TRUE");
    expect(run(rows, { dialect: "sqlserver" }).output).toContain("N'O''Brien'");
    expect(run([{ p: "C:\\x" }], { dialect: "mysql" }).output).toContain("'C:\\\\x'");
    expect(run(rows, { dialect: "sqlite" }).output).toContain("name TEXT");
  });

  it("sizes VARCHAR2 to the longest value and falls back to CLOB past 4000", () => {
    expect(run([{ s: "x".repeat(300) }]).output).toContain("s VARCHAR2(500)");
    expect(run([{ s: "x".repeat(4001) }]).output).toContain("s CLOB");
  });

  it("emits INSERT ALL for Oracle and multi-row VALUES elsewhere", () => {
    const o = run(rows, { multiRow: true, includeCreate: false }).output;
    expect(o.startsWith("INSERT ALL\n  INTO users")).toBe(true);
    expect(o.endsWith("SELECT 1 FROM dual;")).toBe(true);
    const p = run(rows, { multiRow: true, includeCreate: false, dialect: "postgres" }).output;
    expect(p).toMatch(/VALUES\n  \(1, .*\),\n  \(3000000000, .*\);$/);
  });

  it("chunks large batches", () => {
    const many = Array.from({ length: 1200 }, (_, i) => ({ n: i }));
    const out = run(many, { multiRow: true, includeCreate: false, dialect: "postgres" }).output;
    expect(out.match(/INSERT INTO/g)).toHaveLength(3);
  });

  it("accepts a single object and can skip CREATE TABLE", () => {
    const out = run({ a: 1 }, { includeCreate: false }).output;
    expect(out).toBe("INSERT INTO users (a) VALUES (1);");
  });

  it("makes clashing column names unique", () => {
    expect(run([{ "a b": 1, a_b: 2 }]).output).toContain("INSERT INTO users (a_b, a_b_2)");
  });

  it("rejects bad input", () => {
    expect(run([]).error).not.toBeNull();
    expect(run([1, 2]).error).not.toBeNull();
    expect(run({}).error).not.toBeNull();
    expect(convertJsonToSql("{", base).error?.message).toMatch(/Invalid JSON/);
    expect(convertJsonToSql("", base)).toEqual({ output: "", error: null });
  });
});
