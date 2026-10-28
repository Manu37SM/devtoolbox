import { describe, expect, it } from "vitest";
import { buildJdbc, parseBuildInput, parseJdbc, runJdbc } from "./transform";

const o = { database: "postgresql" as const, showSpring: true };

describe("parseJdbc", () => {
  it("parses Oracle service, SID and TNS forms", () => {
    expect(parseJdbc("jdbc:oracle:thin:@//db.example.com:1521/ORCLPDB1")).toMatchObject({ database: "oracle", host: "db.example.com", port: 1521, name: "ORCLPDB1", style: "service name" });
    expect(parseJdbc("jdbc:oracle:thin:@db:1522:XE")).toMatchObject({ port: 1522, name: "XE", style: "SID (legacy)" });
    expect(parseJdbc("jdbc:oracle:thin:@(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=h1)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=svc)))")).toMatchObject({ host: "h1", port: 1521, name: "svc" });
  });
  it("parses PostgreSQL/MySQL URLs with params and default ports", () => {
    expect(parseJdbc("jdbc:postgresql://localhost/app?ssl=true&sslmode=require")).toMatchObject({ database: "postgresql", host: "localhost", port: 5432, name: "app", params: { ssl: "true", sslmode: "require" } });
    expect(parseJdbc("jdbc:mysql://h:3307/db")).toMatchObject({ port: 3307 });
  });
  it("parses SQL Server, H2 and SQLite", () => {
    expect(parseJdbc("jdbc:sqlserver://h:1433;databaseName=sales;encrypt=true")).toMatchObject({ name: "sales", params: { encrypt: "true" } });
    expect(parseJdbc("jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1")).toMatchObject({ database: "h2", name: "testdb", params: { DB_CLOSE_DELAY: "-1" } });
    expect(parseJdbc("jdbc:sqlite:/tmp/x.db")).toMatchObject({ database: "sqlite", name: "/tmp/x.db" });
  });
  it("rejects other input", () => {
    expect(() => parseJdbc("postgres://x")).toThrow(/jdbc:/);
    expect(() => parseJdbc("jdbc:foo:bar")).toThrow(/Unrecognized/);
  });
});

describe("buildJdbc", () => {
  const b = (t: string) => parseBuildInput(t);
  it("builds each dialect", () => {
    expect(buildJdbc("postgresql", b("host: db\ndatabase: app\nparam: sslmode=require"))).toBe("jdbc:postgresql://db:5432/app?sslmode=require");
    expect(buildJdbc("oracle", b("host: db\nport: 1522\ndatabase: SVC"))).toBe("jdbc:oracle:thin:@//db:1522/SVC");
    expect(buildJdbc("oracle", b("host: db\nsid: XE"))).toBe("jdbc:oracle:thin:@db:1521:XE");
    expect(buildJdbc("sqlserver", b("host: h\ndatabase: sales\nparam: encrypt=true"))).toBe("jdbc:sqlserver://h:1433;databaseName=sales;encrypt=true");
    expect(buildJdbc("mysql", b("host: h\ndatabase: d\nparam: serverTimezone=UTC"))).toBe("jdbc:mysql://h:3306/d?serverTimezone=UTC");
    expect(buildJdbc("h2", b("database: t"))).toBe("jdbc:h2:mem:t");
  });
  it("url-encodes param values and validates", () => {
    expect(buildJdbc("postgresql", b("host: h\nparam: a=b c"))).toBe("jdbc:postgresql://h:5432?a=b%20c");
    expect(() => buildJdbc("postgresql", b("port: 5432"))).toThrow(/host/);
    expect(() => buildJdbc("postgresql", b("host: h\nport: 99999"))).toThrow(/Invalid port/);
    expect(() => buildJdbc("oracle", b("host: h"))).toThrow(/service/);
    expect(() => parseBuildInput("nonsense")).toThrow(/Expected/);
    expect(() => parseBuildInput("colour: red")).toThrow(/Unknown key/);
  });
});

describe("runJdbc", () => {
  it("describes a pasted URL with driver and warnings", () => {
    const r = runJdbc("jdbc:oracle:thin:@db:1521:XE", o).output;
    expect(r).toContain("Driver:    oracle.jdbc.OracleDriver");
    expect(r).toContain("SID-style URLs are legacy");
  });
  it("builds a URL plus Spring properties", () => {
    const r = runJdbc("host: db\ndatabase: app", o).output;
    expect(r.split("\n")[0]).toBe("jdbc:postgresql://db:5432/app");
    expect(r).toContain("spring.datasource.driver-class-name=org.postgresql.Driver");
  });
  it("reports errors", () => {
    expect(runJdbc("bad\nline", o).error?.line).toBe(1);
    expect(runJdbc("", o)).toEqual({ output: "", error: null });
  });
});
