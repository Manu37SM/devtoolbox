import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { maskSql, parseKeys, sqlPaginationGenerator } from "./transform";

const gen = (sql: string, o: Parameters<typeof sqlPaginationGenerator>[1] = {}) => {
  const r = sqlPaginationGenerator(sql, o);
  if (r.error) throw new Error(r.error.message);
  return r.output;
};
const body = (s: string) => s.split("\n").filter((l) => !l.startsWith("-- ")).join("\n").trim();

describe("maskSql / parseKeys", () => {
  it("masks strings, comments and nested parens", () => {
    const m = maskSql("select 'order by x', (select 1 order by 2) from t -- order by\n order by id");
    expect(m.match(/order by/gi)?.length).toBe(1);
  });
  it("parses key columns", () => {
    expect(parseKeys("created_at DESC, o.id")).toEqual([{ expr: "created_at", dir: "DESC" }, { expr: "o.id", dir: "ASC" }]);
    expect(parseKeys("lower(a, b) desc nulls last")[0]).toEqual({ expr: "lower(a, b)", dir: "DESC" });
  });
});

describe("offset / page mode", () => {
  const q = "SELECT id, name FROM users ORDER BY id";
  it("postgres/mysql/sqlite", () => {
    expect(body(gen(q, { page: 3, pageSize: 10 }))).toBe("SELECT id, name FROM users\nORDER BY id ASC\nLIMIT 10 OFFSET 20;");
    expect(body(gen(q, { dialect: "mysql", page: 1 }))).toContain("LIMIT 20;");
    expect(body(gen(q, { dialect: "sqlite", mode: "offset", offset: 5, limit: 7 }))).toContain("LIMIT 7 OFFSET 5");
  });
  it("oracle 12c, sql server, db2", () => {
    expect(body(gen(q, { dialect: "oracle", page: 2, pageSize: 5 }))).toContain("OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY");
    expect(body(gen(q, { dialect: "sqlserver", page: 2, pageSize: 5 }))).toContain("OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY");
    expect(body(gen(q, { dialect: "db2", page: 2, pageSize: 5 }))).toContain("OFFSET 5 ROWS FETCH FIRST 5 ROWS ONLY");
  });
  it("oracle 11g ROWNUM", () => {
    const out = gen(q, { dialect: "oracle11", page: 3, pageSize: 10 });
    expect(out).toContain("WHERE ROWNUM <= 30");
    expect(out).toContain("WHERE rn > 20");
  });
  it("sql server without ORDER BY warns and adds a placeholder order", () => {
    const out = gen("SELECT * FROM t", { dialect: "sqlserver" });
    expect(out).toContain("ORDER BY (SELECT NULL)");
    expect(out).toContain("NOTE");
  });
  it("adds orderBy when missing", () => {
    expect(gen("SELECT * FROM t", { orderBy: "id DESC" })).toContain("ORDER BY id DESC");
  });
  it("look-ahead and count", () => {
    const out = gen(q, { lookahead: true, pageSize: 10, countQuery: true });
    expect(out).toContain("LIMIT 11");
    expect(out).toContain("SELECT COUNT(*) FROM (");
    expect(out).not.toMatch(/\) c AS/);
  });
  it("keeps the ORDER BY of a subquery and not of the outer", () => {
    const out = gen("SELECT * FROM (SELECT * FROM t ORDER BY x) s ORDER BY y DESC", {});
    expect(out).toContain("ORDER BY y DESC");
    expect(out).toContain("ORDER BY x)");
  });
  it("placeholder styles", () => {
    const base = { page: 2, pageSize: 10 } as const;
    expect(gen(q, { ...base, params: "question" })).toContain("LIMIT ? OFFSET ?");
    expect(gen(q, { ...base, params: "named" })).toContain("LIMIT :limit OFFSET :offset");
    expect(gen(q, { ...base, params: "dollar" })).toContain("LIMIT $1 OFFSET $2");
    expect(gen(q, { ...base, params: "at" })).toContain("LIMIT @limit OFFSET @offset");
    expect(gen(q, { ...base, params: "named" })).toContain("-- bind: limit=10, offset=10");
  });
  it("rejects existing paging and non-selects", () => {
    expect(sqlPaginationGenerator("select * from t limit 5").error).not.toBeNull();
    expect(sqlPaginationGenerator("select * from t fetch first 5 rows only").error).not.toBeNull();
    expect(sqlPaginationGenerator("select top 5 * from t").error).not.toBeNull();
    expect(sqlPaginationGenerator("delete from t").error).not.toBeNull();
    expect(sqlPaginationGenerator("").output).toBe("");
  });
  it("ignores LIMIT inside a subquery or string", () => {
    expect(sqlPaginationGenerator("select * from (select * from t limit 5) x where a = 'limit 3'").error).toBeNull();
  });
});

describe("keyset mode", () => {
  const q = "SELECT id, created_at, title FROM posts ORDER BY created_at DESC, id DESC";
  it("first page and next page with literals", () => {
    expect(gen(q, { mode: "keyset", pageSize: 5 })).toContain("ORDER BY created_at DESC, id DESC\nLIMIT 5");
    const out = gen(q, { mode: "keyset", pageSize: 5, after: "'2024-01-01', 9" });
    expect(out).toContain("WHERE (created_at, id) < ('2024-01-01', 9)");
  });
  it("mixed directions expand to OR chains", () => {
    const out = gen("SELECT * FROM t ORDER BY a ASC, b DESC", { mode: "keyset", after: "1, 2" });
    expect(out).toContain("a > 1");
    expect(out).toContain("(a = 1 AND b < 2)");
    expect(out).not.toContain("(a, b)");
  });
  it("oracle and sql server keyset forms", () => {
    expect(gen(q, { mode: "keyset", dialect: "sqlserver", pageSize: 5 })).toContain("SELECT TOP (5)");
    expect(gen(q, { mode: "keyset", dialect: "oracle", pageSize: 5 })).toContain("FETCH FIRST 5 ROWS ONLY");
    expect(gen(q, { mode: "keyset", dialect: "oracle11", pageSize: 5 })).toContain("WHERE ROWNUM <= 5");
    expect(gen(q, { mode: "keyset", dialect: "oracle", after: "1,2" })).not.toContain("(created_at, id)");
  });
  it("placeholder mode emits both queries", () => {
    const out = gen(q, { mode: "keyset", params: "named" });
    expect(out).toContain("-- first page");
    expect(out).toContain("-- next pages");
    expect(out).toContain(":k1");
  });
  it("strips table qualifiers for the wrapped query", () => {
    const out = gen("SELECT o.id FROM orders o ORDER BY o.id", { mode: "keyset", after: "5" });
    expect(out).toContain("WHERE id > 5");
  });
  it("validates", () => {
    expect(sqlPaginationGenerator("select * from t", { mode: "keyset" }).error?.message).toMatch(/key columns/);
    expect(sqlPaginationGenerator("select * from t order by a, b", { mode: "keyset", after: "1" }).error?.message).toMatch(/Expected 2/);
  });
  it("escapes quotes in values", () => {
    expect(gen("select * from t order by name", { mode: "keyset", after: "'O''Brien'" })).toContain("name > 'O''Brien'");
  });
});

// ---- oracle: run generated SQL against real SQLite and compare with slicing ----
const hasPy = spawnSync("python3", ["-c", "import sqlite3"], { encoding: "utf8" }).status === 0;
const runSqlite = (sql: string): unknown[][] => {
  const script = `
import sqlite3, sys, json
c = sqlite3.connect(":memory:")
c.execute("create table posts(id integer primary key, grp integer, name text, created_at text)")
rows = []
for i in range(1, 58):
    rows.append((i, i % 4, "n%02d" % ((i * 7) % 23), "2024-01-%02d" % (1 + (i * 5) % 9)))
c.executemany("insert into posts values (?,?,?,?)", rows)
out = []
for stmt in json.loads(sys.stdin.read()):
    out.append([list(r) for r in c.execute(stmt).fetchall()])
print(json.dumps(out))`;
  const p = spawnSync("python3", ["-c", script], { input: JSON.stringify([sql]), encoding: "utf8" });
  if (p.status !== 0) throw new Error(p.stderr);
  return (JSON.parse(p.stdout) as unknown[][][])[0]!;
};
const all = (): number[] => (runSqlite("select id from posts order by id") as number[][]).map((r) => r[0]!);

describe.skipIf(!hasPy)("sqlite oracle", () => {
  it("page mode returns the right slice", () => {
    const ids = all();
    for (const [page, size] of [[1, 10], [3, 10], [6, 10], [2, 25], [7, 10]] as const) {
      const sql = gen("SELECT id FROM posts ORDER BY id", { dialect: "sqlite", page, pageSize: size });
      const got = (runSqlite(body(sql).replace(/;$/, "")) as number[][]).map((r) => r[0]);
      expect(got).toEqual(ids.slice((page - 1) * size, page * size));
    }
  });

  it("keyset walks the whole table exactly once, in order (mixed directions, ties)", () => {
    const orderBy = "grp ASC, created_at DESC, id DESC";
    const expected = (runSqlite(`select id from posts order by ${orderBy}`) as number[][]).map((r) => r[0]);
    for (const dialect of ["sqlite", "postgresql", "mysql"] as const) {
      const seen: number[] = [];
      let after = "";
      for (let n = 0; n < 40; n++) {
        const sql = gen(`SELECT id, grp, created_at FROM posts ORDER BY ${orderBy}`, { dialect, mode: "keyset", pageSize: 8, after });
        const rows = runSqlite(body(sql).replace(/;$/, "")) as unknown[][];
        if (rows.length === 0) break;
        seen.push(...rows.map((r) => r[0] as number));
        const last = rows[rows.length - 1]!;
        after = `${last[1]}, '${last[2]}', ${last[0]}`;
      }
      expect(seen).toEqual(expected);
    }
  });

  it("row-value keyset (all DESC) matches", () => {
    const expected = (runSqlite("select id from posts order by created_at desc, id desc") as number[][]).map((r) => r[0]);
    const seen: number[] = [];
    let after = "";
    for (let n = 0; n < 40; n++) {
      const sql = gen("SELECT id, created_at FROM posts ORDER BY created_at DESC, id DESC", { dialect: "postgresql", mode: "keyset", pageSize: 9, after });
      expect(sql).toContain(after ? "(created_at, id) <" : "LIMIT 9");
      const rows = runSqlite(body(sql).replace(/;$/, "")) as unknown[][];
      if (!rows.length) break;
      seen.push(...rows.map((r) => r[0] as number));
      const last = rows[rows.length - 1]!;
      after = `'${last[1]}', ${last[0]}`;
    }
    expect(seen).toEqual(expected);
  });

  it("count query counts all rows", () => {
    const out = gen("SELECT id FROM posts WHERE grp = 1 ORDER BY id", { dialect: "sqlite", countQuery: true });
    const countStmt = out.slice(out.indexOf("-- total rows")).replace(/^-- .*\n/gm, "").replace(/;[\s\S]*$/, "");
    const direct = (runSqlite("select count(*) from posts where grp = 1") as number[][])[0]![0];
    expect((runSqlite(countStmt) as number[][])[0]![0]).toBe(direct);
  });
});
