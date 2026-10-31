import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { detectDialect, sqlDataTypeMapper } from "./transform";
import { parseType } from "./types";

const conv = (sql: string, o: Parameters<typeof sqlDataTypeMapper>[1] = {}) => {
  const r = sqlDataTypeMapper(sql, o);
  if (r.error) throw new Error(r.error.message);
  return r.output;
};
const po = { integers: "smart", numberOneAsBoolean: false } as const;

const ORACLE = `
CREATE TABLE accounts (
  id            NUMBER(19) NOT NULL,
  acct_no       VARCHAR2(20 CHAR) NOT NULL,
  balance       NUMBER(19,2) DEFAULT 0 NOT NULL,
  status        CHAR(1) DEFAULT 'A',
  opened_on     DATE DEFAULT SYSDATE,
  updated_at    TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP,
  notes         CLOB,
  photo         BLOB,
  token         RAW(16) DEFAULT SYS_GUID(),
  is_active     NUMBER(1) DEFAULT 1,
  rate          BINARY_DOUBLE,
  branch_id     NUMBER(10),
  CONSTRAINT pk_accounts PRIMARY KEY (id),
  CONSTRAINT uq_acct UNIQUE (acct_no),
  CONSTRAINT fk_branch FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE,
  CONSTRAINT ck_bal CHECK (balance >= 0)
) TABLESPACE users;`;

describe("parseType", () => {
  it("oracle NUMBER", () => {
    expect(parseType("oracle", "NUMBER(19,2)", po)).toMatchObject({ k: "dec", p: 19, s: 2 });
    expect(parseType("oracle", "NUMBER(3)", po).k).toBe("i2");
    expect(parseType("oracle", "NUMBER(9)", po).k).toBe("i4");
    expect(parseType("oracle", "NUMBER(18)", po).k).toBe("i8");
    expect(parseType("oracle", "NUMBER(25)", po)).toMatchObject({ k: "dec", p: 25 });
    expect(parseType("oracle", "NUMBER(9)", { ...po, integers: "numeric" }).k).toBe("dec");
    expect(parseType("oracle", "NUMBER(1)", { ...po, numberOneAsBoolean: true }).k).toBe("bool");
    expect(parseType("oracle", "NUMBER", po).p).toBeUndefined();
  });
  it("dates", () => {
    expect(parseType("oracle", "DATE", po)).toMatchObject({ k: "ts", fsp: 0 });
    expect(parseType("postgresql", "date", po).k).toBe("date");
    expect(parseType("mysql", "datetime(3)", po)).toMatchObject({ k: "ts", fsp: 3 });
    expect(parseType("mysql", "timestamp", po).k).toBe("tstz");
    expect(parseType("sqlserver", "timestamp", po).k).toBe("varbin");
    expect(parseType("postgresql", "timestamp(3) with time zone", po)).toMatchObject({ k: "tstz", fsp: 3 });
    expect(parseType("postgresql", "timestamp without time zone", po).k).toBe("ts");
  });
  it("strings and binary", () => {
    expect(parseType("sqlserver", "nvarchar(max)", po)).toMatchObject({ k: "varchar", len: "max", nat: true });
    expect(parseType("postgresql", "character varying(40)", po)).toMatchObject({ k: "varchar", len: 40 });
    expect(parseType("oracle", "VARCHAR2(10 BYTE)", po)).toMatchObject({ k: "varchar", len: 10 });
    expect(parseType("mysql", "longtext", po).k).toBe("text");
    expect(parseType("postgresql", "bytea", po).k).toBe("blob");
    expect(parseType("oracle", "RAW(16)", po)).toMatchObject({ k: "varbin", len: 16 });
  });
  it("mysql specifics", () => {
    expect(parseType("mysql", "tinyint(1)", po).k).toBe("bool");
    expect(parseType("mysql", "int unsigned", po)).toMatchObject({ k: "i4", unsigned: true });
    expect(parseType("mysql", "bigint(20) unsigned", po)).toMatchObject({ k: "i8", unsigned: true });
    expect(parseType("sqlserver", "tinyint", po)).toMatchObject({ k: "i1", unsigned: true });
  });
  it("unknown types survive with a note", () => {
    const t = parseType("postgresql", "tsvector", po);
    expect(t.k).toBe("other");
    expect(t.notes[0]).toMatch(/Unknown type/);
  });
});

describe("dialect detection", () => {
  it("detects", () => {
    expect(detectDialect("create table t (a number(5), b varchar2(10))")).toBe("oracle");
    expect(detectDialect("create table `t` (a int) ENGINE=InnoDB")).toBe("mysql");
    expect(detectDialect("create table [t] (a int identity(1,1))")).toBe("sqlserver");
    expect(detectDialect("create table t (a serial)")).toBe("postgresql");
  });
});

describe("oracle → others", () => {
  it("postgresql", () => {
    const out = conv(ORACLE, { to: "postgresql" });
    expect(out).toContain("id numeric(19,0) NOT NULL");
    expect(out).toContain("acct_no varchar(20) NOT NULL");
    expect(out).toContain("balance numeric(19,2) DEFAULT 0 NOT NULL");
    expect(out).toContain("opened_on timestamp(0) DEFAULT CURRENT_TIMESTAMP");
    expect(out).toContain("updated_at timestamptz(6) DEFAULT CURRENT_TIMESTAMP");
    expect(out).toContain("notes text");
    expect(out).toContain("photo bytea");
    expect(out).toContain("token uuid DEFAULT gen_random_uuid()");
    expect(out).toContain("is_active smallint DEFAULT 1");
    expect(out).toContain("rate double precision");
    expect(out).toContain("CONSTRAINT pk_accounts PRIMARY KEY (id)");
    expect(out).toContain("FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE");
    expect(out).toMatch(/NOTE: opened_on: Oracle DATE stores date AND time/);
    expect(out).toMatch(/NOTE: table options dropped: TABLESPACE users/);
    expect(out).toMatch(/Oracle treats '' as NULL/);
  });
  it("mysql / sqlserver / sqlite / db2", () => {
    expect(conv(ORACLE, { to: "mysql" })).toContain("balance decimal(19,2) DEFAULT 0 NOT NULL");
    expect(conv(ORACLE, { to: "mysql" })).toContain("notes longtext");
    expect(conv(ORACLE, { to: "sqlserver" })).toContain("updated_at datetimeoffset(6) DEFAULT SYSDATETIME()");
    expect(conv(ORACLE, { to: "sqlserver" })).toContain("photo varbinary(max)");
    expect(conv(ORACLE, { to: "sqlite" })).toContain("balance NUMERIC DEFAULT 0 NOT NULL");
    expect(conv(ORACLE, { to: "db2" })).toContain("balance DECIMAL(19,2) DEFAULT 0 NOT NULL");
    expect(conv(ORACLE, { to: "db2" })).toContain("opened_on TIMESTAMP(0) DEFAULT CURRENT TIMESTAMP");
  });
  it("number(1) as boolean", () => {
    expect(conv(ORACLE, { to: "postgresql", numberOneAsBoolean: true })).toContain("is_active boolean DEFAULT TRUE");
    expect(conv(ORACLE, { to: "mysql", numberOneAsBoolean: true })).toContain("is_active tinyint(1) DEFAULT 1");
  });
});

describe("others → oracle", () => {
  const PG = `CREATE TABLE "Order" (
    id bigserial PRIMARY KEY,
    code varchar(30) NOT NULL UNIQUE,
    total numeric(12,2) NOT NULL DEFAULT 0,
    paid boolean NOT NULL DEFAULT false,
    placed_at timestamptz NOT NULL DEFAULT now(),
    meta jsonb,
    ref uuid DEFAULT gen_random_uuid(),
    body text
  );`;
  it("maps and quotes reserved/quoted names", () => {
    const out = conv(PG, { to: "oracle" });
    expect(out).toContain('CREATE TABLE "Order"');
    expect(out).toContain("id NUMBER(19) GENERATED BY DEFAULT AS IDENTITY NOT NULL PRIMARY KEY");
    expect(out).toContain("code VARCHAR2(30 CHAR) NOT NULL UNIQUE");
    expect(out).toContain("paid NUMBER(1) DEFAULT 0 NOT NULL");
    expect(out).toContain("placed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL");
    expect(out).toContain("meta JSON");
    expect(out).toContain("ref RAW(16) DEFAULT SYS_GUID()");
    expect(out).toContain("body CLOB");
  });
  it("identifier case option", () => {
    const out = conv("create table Users (UserId int, \"Full Name\" text)", { to: "oracle", from: "postgresql", identifiers: "upper" });
    expect(out).toContain("CREATE TABLE USERS");
    expect(out).toContain("USERID");
    expect(out).toContain('"FULL NAME"');
  });
  it("mysql source", () => {
    const out = conv("CREATE TABLE `t` (`id` int unsigned NOT NULL AUTO_INCREMENT, `n` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'x', `b` tinyint(1) NOT NULL DEFAULT '0', PRIMARY KEY (`id`), KEY `idx_n` (`n`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;", { to: "postgresql" });
    expect(out).toContain("id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL");
    expect(out).toContain("n varchar(50) DEFAULT NULL");
    expect(out).toContain("b boolean DEFAULT FALSE NOT NULL");
    expect(out).toContain("PRIMARY KEY (id)");
    expect(out).toContain("CREATE INDEX idx_n ON t (n);");
    expect(out).toMatch(/COLLATE utf8mb4_bin dropped/);
    expect(out).toMatch(/COMMENT 'x' dropped/);
    expect(out).toMatch(/unsigned int widened to bigint/);
  });
  it("sql server source", () => {
    const out = conv("CREATE TABLE [dbo].[Cust] ([Id] int IDENTITY(1,1) NOT NULL, [Name] nvarchar(100) NOT NULL, [Active] bit NOT NULL DEFAULT ((1)), [Created] datetime2(3) DEFAULT (getdate()), [Guid] uniqueidentifier DEFAULT (newid()), PRIMARY KEY CLUSTERED ([Id]));", { to: "postgresql" });
    expect(out).toContain('dbo."Cust"');
    expect(out).toContain('"Id" integer GENERATED BY DEFAULT AS IDENTITY NOT NULL');
    expect(out).toContain('"Name" varchar(100) NOT NULL');
    expect(out).toContain('"Active" boolean DEFAULT TRUE NOT NULL');
    expect(out).toContain('"Created" timestamp(3) DEFAULT CURRENT_TIMESTAMP');
    expect(out).toContain('"Guid" uuid DEFAULT gen_random_uuid()');
    expect(out).toContain('PRIMARY KEY ("Id")');
  });
  it("sqlite autoincrement", () => {
    const out = conv("create table t (id integer primary key autoincrement, v text)", { to: "sqlite", from: "sqlite" });
    expect(out).toContain("id INTEGER PRIMARY KEY AUTOINCREMENT");
  });
  it("identity per target", () => {
    const src = "create table t (id int generated always as identity primary key)";
    expect(conv(src, { from: "postgresql", to: "mysql" })).toContain("id int AUTO_INCREMENT NOT NULL PRIMARY KEY");
    expect(conv(src, { from: "postgresql", to: "sqlserver" })).toContain("id int IDENTITY(1,1) NOT NULL PRIMARY KEY");
    expect(conv(src, { from: "postgresql", to: "db2" })).toContain("id INTEGER GENERATED BY DEFAULT AS IDENTITY NOT NULL PRIMARY KEY");
  });
  it("foreign key actions Oracle can't do are dropped with a note", () => {
    const out = conv("create table c (id int primary key, p int references parent(id) on delete restrict on update cascade)", { from: "postgresql", to: "oracle" });
    expect(out.split("-- NOTE")[0]).not.toMatch(/ON (UPDATE|DELETE)/);
    expect(out).toMatch(/not supported by Oracle/);
  });
  it("lengths beyond target limits", () => {
    expect(conv("create table t (a varchar(9000))", { from: "postgresql", to: "oracle" })).toContain("a CLOB");
    expect(conv("create table t (a varchar(9000))", { from: "postgresql", to: "sqlserver" })).toContain("a varchar(max)");
    expect(conv("create table t (a numeric(50,10))", { from: "postgresql", to: "oracle" })).toContain("NUMBER(38,10)");
    expect(conv("create table t (a numeric(50,10))", { from: "postgresql", to: "oracle" })).toMatch(/exceeds/);
  });
  it("unicode option", () => {
    expect(conv("create table t (a varchar(10))", { from: "postgresql", to: "sqlserver", unicode: true })).toContain("nvarchar(10)");
    expect(conv("create table t (a varchar(10))", { from: "postgresql", to: "oracle", unicode: true })).toContain("NVARCHAR2(10)");
  });
});

describe("types mode", () => {
  it("lists every database plus Java / JDBC / TypeScript", () => {
    const out = conv("create table t (amount number(19,2), id number(18), at timestamp with time zone)", { from: "oracle", mode: "types" });
    expect(out).toContain("PostgreSQL numeric(19,2)");
    expect(out).toContain("Java BigDecimal · JDBC Types.NUMERIC · TypeScript string");
    expect(out).toContain("Java long / Long");
    expect(out).toContain("OffsetDateTime");
  });
});

describe("errors and edge cases", () => {
  it("no create table", () => {
    expect(sqlDataTypeMapper("select 1").error?.message).toMatch(/No CREATE TABLE/);
    expect(sqlDataTypeMapper("").output).toBe("");
  });
  it("converts several tables and keeps going past other statements", () => {
    const out = conv("create table a (x int); insert into a values (1); create table b (y int);", { from: "postgresql" });
    expect(out).toContain("CREATE TABLE a");
    expect(out).toContain("CREATE TABLE b");
    expect(out).toContain("-- skipped");
  });
  it("handles comments and strings with commas/semicolons", () => {
    const out = conv("-- header\ncreate table t (a varchar(10) default 'x,y;z', /* c, d */ b int);", { from: "postgresql" });
    expect(out).toContain("DEFAULT 'x,y;z'");
    expect(out).toContain("b integer");
  });
});

// ---- oracle: execute PostgreSQL and SQLite output on real servers ----
const PGARGS = ["-h", "/var/tmp", "-p", "55432", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-X"];
const hasPg = (() => {
  const r = spawnSync("psql", [...PGARGS, "-tc", "select 1"], { encoding: "utf8" });
  return r.status === 0;
})();
const runPg = (ddl: string) => {
  const r = spawnSync("psql", [...PGARGS], { input: `set client_min_messages=warning; drop schema if exists t cascade; create schema t; set search_path=t;\n${ddl}\n`, encoding: "utf8" });
  return { ok: r.status === 0, err: r.stderr };
};
describe.skipIf(!hasPg)("PostgreSQL executes the converted DDL", () => {
  const cases: Array<[string, string, Parameters<typeof sqlDataTypeMapper>[1]]> = [
    ["oracle", ORACLE.replace("REFERENCES branches (id)", "REFERENCES branches (id)"), { from: "oracle" }],
    ["mysql", "CREATE TABLE `orders` (`id` bigint unsigned NOT NULL AUTO_INCREMENT, `code` varchar(30) NOT NULL, `amt` decimal(12,2) DEFAULT '0.00', `at` datetime(3) DEFAULT CURRENT_TIMESTAMP, `ok` tinyint(1) NOT NULL DEFAULT 1, `blob1` longblob, `j` json, `d` date, PRIMARY KEY (`id`), UNIQUE KEY `uq_code` (`code`), KEY `idx_at` (`at`)) ENGINE=InnoDB;", { from: "mysql" }],
    ["sqlserver", "CREATE TABLE [dbo].[T] ([Id] bigint IDENTITY(1,1) NOT NULL, [N] nvarchar(max), [M] money, [F] float, [B] bit DEFAULT 0, [U] uniqueidentifier DEFAULT NEWID(), [D] datetimeoffset(2), [Img] varbinary(max), CONSTRAINT [PK_T] PRIMARY KEY CLUSTERED ([Id]));", { from: "sqlserver" }],
    ["db2", "CREATE TABLE s.t (id INTEGER NOT NULL GENERATED BY DEFAULT AS IDENTITY, a VARCHAR(40), b DECIMAL(10,2), c CLOB, d TIMESTAMP(6), PRIMARY KEY (id))", { from: "db2" }],
    ["pg", "create table p (id serial primary key, a int[] , b text default 'x', c timestamp(3) with time zone default now(), d double precision, e char(3) not null default 'ab')", { from: "postgresql" }],
  ];
  for (const [name, ddl, o] of cases) {
    it(`${name} → postgresql`, () => {
      const out = conv(ddl, { ...o, to: "postgresql" });
      const dep = name === "oracle" ? "create table branches (id int primary key);\n" : "";
      const r = runPg(dep + out.replace(/\bdbo\./g, "").replace(/\bs\./g, ""));
      expect(r.err).toBe("");
      expect(r.ok).toBe(true);
    });
  }
});

const hasPy = spawnSync("python3", ["-c", "import sqlite3"], { encoding: "utf8" }).status === 0;
describe.skipIf(!hasPy)("SQLite executes the converted DDL", () => {
  it("oracle → sqlite", () => {
    const out = conv(ORACLE.replace(/CONSTRAINT fk_branch[^\n]*\n/, "").replace("  CONSTRAINT ck_bal CHECK (balance >= 0)\n", "").replace("branch_id     NUMBER(10),\n", "branch_id     NUMBER(10)\n").replace(/,\n\) TABLESPACE/, "\n) TABLESPACE"), { from: "oracle", to: "sqlite" });
    const r = spawnSync("python3", ["-c", "import sqlite3,sys; c=sqlite3.connect(':memory:'); c.executescript(sys.stdin.read())"], { input: out, encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });
});

const SWEEP: Record<string, string[]> = {
  oracle: ["NUMBER", "NUMBER(5)", "NUMBER(12)", "NUMBER(30)", "NUMBER(10,3)", "FLOAT(24)", "FLOAT", "BINARY_FLOAT", "BINARY_DOUBLE", "VARCHAR2(50)", "NVARCHAR2(50)", "CHAR(3)", "NCHAR(3)", "CLOB", "NCLOB", "BLOB", "RAW(32)", "LONG", "DATE", "TIMESTAMP", "TIMESTAMP(3)", "TIMESTAMP(9) WITH TIME ZONE", "TIMESTAMP WITH LOCAL TIME ZONE", "ROWID", "XMLTYPE", "INTEGER", "SMALLINT"],
  mysql: ["tinyint", "tinyint(1)", "smallint", "mediumint", "int", "int unsigned", "bigint", "bigint unsigned", "decimal(10,2)", "float", "double", "char(5)", "varchar(255)", "tinytext", "text", "mediumtext", "longtext", "binary(8)", "varbinary(64)", "tinyblob", "blob", "longblob", "date", "time(3)", "datetime", "datetime(6)", "timestamp", "year", "json"],
  sqlserver: ["tinyint", "smallint", "int", "bigint", "bit", "decimal(18,4)", "numeric(10)", "money", "smallmoney", "float", "float(24)", "real", "char(10)", "varchar(50)", "varchar(max)", "nchar(10)", "nvarchar(50)", "nvarchar(max)", "text", "ntext", "binary(16)", "varbinary(100)", "varbinary(max)", "image", "date", "time(5)", "datetime", "datetime2(4)", "smalldatetime", "datetimeoffset(3)", "uniqueidentifier", "xml", "rowversion"],
  postgresql: ["smallint", "integer", "bigint", "numeric(10,2)", "numeric", "real", "double precision", "money", "char(4)", "varchar(30)", "varchar", "text", "bytea", "boolean", "date", "time", "time with time zone", "timestamp(2)", "timestamp with time zone", "interval", "uuid", "json", "jsonb", "xml", "inet", "bit(8)", "bit varying(8)"],
  db2: ["SMALLINT", "INTEGER", "BIGINT", "DECIMAL(15,3)", "REAL", "DOUBLE", "CHAR(8)", "VARCHAR(100)", "CLOB", "BLOB", "DATE", "TIME", "TIMESTAMP(6)", "BOOLEAN", "XML"],
};
describe.skipIf(!hasPg)("PostgreSQL executes every supported source type", () => {
  for (const [src, types] of Object.entries(SWEEP)) {
    it(`${src} types`, () => {
      const cols = types.map((t, i) => `c${i} ${t}`).join(",\n  ");
      const out = conv(`create table sweep (\n  ${cols}\n);`, { from: src as "oracle", to: "postgresql" });
      const r = runPg(out);
      expect(r.err).toBe("");
      expect(r.ok).toBe(true);
    });
  }
});
describe.skipIf(!hasPy)("SQLite executes every supported source type", () => {
  for (const [src, types] of Object.entries(SWEEP)) {
    it(`${src} types`, () => {
      const cols = types.map((t, i) => `c${i} ${t}`).join(",\n  ");
      const out = conv(`create table sweep (\n  ${cols}\n);`, { from: src as "oracle", to: "sqlite" });
      const r = spawnSync("python3", ["-c", "import sqlite3,sys; sqlite3.connect(':memory:').executescript(sys.stdin.read())"], { input: out, encoding: "utf8" });
      expect(r.stderr).toBe("");
    });
  }
});
