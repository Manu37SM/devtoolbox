import { describe, expect, it } from "vitest";
import { runSqlInClauseBuilder, splitValues } from "./transform";
import type { SqlInClauseBuilderOptions } from "./schema";

const base: SqlInClauseBuilderOptions = { format: "in", quoting: "auto", chunkSize: 1000, column: "id", dedupe: true };
const run = (s: string, o: Partial<SqlInClauseBuilderOptions> = {}) => runSqlInClauseBuilder(s, { ...base, ...o });

describe("splitValues", () => {
  it("splits lines, commas and strips wrapping quotes", () => {
    expect(splitValues("a\nb\n\n c ")).toEqual(["a", "b", "c"]);
    expect(splitValues("1, 2,3")).toEqual(["1", "2", "3"]);
    expect(splitValues("'x','y'")).toEqual(["x", "y"]);
  });
});

describe("runSqlInClauseBuilder", () => {
  it("leaves numbers unquoted and escapes quotes in strings", () => {
    expect(run("1\n2\n2").output).toBe("-- 2 values (1 duplicate removed), unquoted numbers\nid IN (1, 2)");
    expect(run("O'Brien\nSmith", { column: "last_name" }).output).toContain("last_name IN ('O''Brien', 'Smith')");
  });
  it("forces strings for zero-padded codes", () => {
    expect(run("007\n42", { quoting: "string" }).output).toContain("id IN ('007', '42')");
  });
  it("chunks for ORA-01795 and ORs the chunks", () => {
    const vals = Array.from({ length: 2500 }, (_, i) => String(i + 1)).join("\n");
    const out = run(vals, { format: "or-chunks" }).output;
    expect(out.match(/id IN \(/g)).toHaveLength(3);
    expect(out).toContain("\n  OR id IN (1001,");
    expect(run(vals).output).toContain("Split into 3 IN lists of at most 1000");
  });
  it("builds VALUES, UNION ALL and INSERT forms", () => {
    expect(run("a\nb", { format: "values", column: "code" }).output).toContain("SELECT * FROM (VALUES\n  ('a'),\n  ('b')\n) AS t(code)");
    expect(run("1\n2", { format: "union-all" }).output).toContain("SELECT 1 AS id FROM dual\nUNION ALL\nSELECT 2 FROM dual");
    expect(run("1\n2\n3", { format: "insert", chunkSize: 2 }).output).toContain("INSERT INTO tmp_ids (id) VALUES\n  (1),\n  (2);\n\nINSERT INTO tmp_ids (id) VALUES\n  (3);");
  });
  it("rejects unsafe column names and non-numbers when numbers are forced", () => {
    expect(run("1", { column: "id; DROP TABLE x" }).error?.message).toContain("not a plain column name");
    expect(run("1\nx", { quoting: "number" }).error?.message).toContain('"x" is not a number');
  });
});
