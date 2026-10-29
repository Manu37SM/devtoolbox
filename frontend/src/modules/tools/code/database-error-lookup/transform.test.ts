import { describe, expect, it } from "vitest";
import { findCodes, runDatabaseErrorLookup } from "./transform";
import { MYSQL, ORACLE, POSTGRES } from "./data";

const run = (s: string, database: "auto" | "oracle" | "postgresql" | "mysql" = "auto") => runDatabaseErrorLookup(s, { database });

describe("data", () => {
  it("uses well-formed codes", () => {
    for (const k of Object.keys(ORACLE)) expect(k).toMatch(/^\d{5}$/);
    for (const k of Object.keys(POSTGRES)) expect(k).toMatch(/^[0-9A-Z]{5}$/);
    for (const [k, v] of Object.entries(MYSQL)) { expect(k).toMatch(/^\d{4}$/); expect(v.sqlstate).toMatch(/^[0-9A-Z]{5}$/); }
  });
});

describe("findCodes", () => {
  it("extracts codes from stack traces", () => {
    const trace = `java.sql.SQLIntegrityConstraintViolationException: ORA-00001: unique constraint (APP.UK_EMAIL) violated
ORA-06512: at "APP.PKG_USERS", line 42`;
    expect(findCodes(trace, "auto").map((h) => h.code)).toEqual(["00001", "06512"]);
    expect(findCodes("ERROR 1062 (23000): Duplicate entry 'a' for key 'PRIMARY'", "auto").map((h) => `${h.db}:${h.code}`)).toEqual(["mysql:1062"]);
  });
  it("recognises PostgreSQL messages without a code", () => {
    expect(findCodes('ERROR: duplicate key value violates unique constraint "users_email_key"', "auto")[0]).toMatchObject({ db: "postgresql", code: "23505" });
    expect(findCodes('org.postgresql.util.PSQLException: ERROR: relation "orderz" does not exist', "auto")[0]!.code).toBe("42P01");
  });
  it("accepts bare codes", () => {
    expect(findCodes("00942", "auto")[0]).toMatchObject({ db: "oracle", code: "00942" });
    expect(findCodes("40P01", "auto")[0]).toMatchObject({ db: "postgresql", code: "40P01" });
    expect(findCodes("1213", "mysql")[0]).toMatchObject({ db: "mysql", code: "1213" });
  });
});

describe("runDatabaseErrorLookup", () => {
  it("explains cause, fix and Spring mapping", () => {
    const out = run("ORA-01795");
    expect(out.output).toContain("ORA-01795\n  maximum number of expressions in a list is 1000");
    expect(out.output).toContain("Fix:   Split into IN (...) OR IN (...) chunks");
    expect(run("SQL state: 23505").output).toContain("Spring usually translates this to DuplicateKeyException.");
    expect(run("ERROR 1213 (40001)").output).toContain("MySQL 1213 (SQLSTATE 40001)");
  });
  it("falls back to the SQLSTATE class for unknown codes", () => {
    expect(run("SQLSTATE[22X99]").output).toContain("class 22: Data exception");
  });
  it("explains what it accepts when nothing matches", () => {
    expect(run("everything is fine").error?.message).toContain("ORA-00942");
  });
});
