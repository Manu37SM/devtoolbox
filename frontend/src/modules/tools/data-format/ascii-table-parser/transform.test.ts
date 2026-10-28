import { describe, expect, it } from "vitest";
import type { AsciiTableParserOptions } from "./schema";
import { columnStarts, parseTable, runAsciiTable } from "./transform";

const run = (s: string, output: AsciiTableParserOptions["output"] = "json", inferTypes = true) => runAsciiTable(s, { output, inferTypes });

const MYSQL = `+----+-------+--------+
| id | name  | active |
+----+-------+--------+
|  1 | Alice | true   |
|  2 | Bob   | false  |
+----+-------+--------+
2 rows in set (0.00 sec)`;

const PSQL = ` id | name  | score
----+-------+-------
  1 | Alice |  9.5
  2 | Bob   |
(2 rows)`;

const KUBECTL = `NAME                     READY   STATUS    RESTARTS   AGE
web-7d4b9c6f5-abcde      1/1     Running   0          3d
db-0                     0/1     Pending   2          5m`;

describe("parseTable", () => {
  it("mysql box tables (ignores the row-count footer? no: it is not a table row)", () => {
    const t = parseTable(MYSQL.split("\n").slice(0, 6).join("\n"));
    expect(t).toEqual({ header: ["id", "name", "active"], rows: [["1", "Alice", "true"], ["2", "Bob", "false"]] });
  });
  it("psql style", () => {
    const t = parseTable(PSQL.split("\n").slice(0, 4).join("\n"));
    expect(t).toEqual({ header: ["id", "name", "score"], rows: [["1", "Alice", "9.5"], ["2", "Bob", ""]] });
  });
  it("unicode box drawing and markdown", () => {
    expect(parseTable("┌───┬───┐\n│ a │ b │\n├───┼───┤\n│ 1 │ 2 │\n└───┴───┘")).toEqual({ header: ["a", "b"], rows: [["1", "2"]] });
    expect(parseTable("| a | b |\n|---|:-:|\n| x | y |")).toEqual({ header: ["a", "b"], rows: [["x", "y"]] });
  });
  it("whitespace-aligned (kubectl) uses header offsets", () => {
    expect(columnStarts("NAME     READY   STATUS")).toEqual([0, 9, 17]);
    expect(parseTable(KUBECTL)).toEqual({ header: ["NAME", "READY", "STATUS", "RESTARTS", "AGE"], rows: [["web-7d4b9c6f5-abcde", "1/1", "Running", "0", "3d"], ["db-0", "0/1", "Pending", "2", "5m"]] });
  });
  it("rejects ragged rows", () => {
    expect(parseTable("| a | b |\n| 1 |")).toMatch(/Row 2 has 1 cells/);
  });
});

describe("runAsciiTable", () => {
  it("json with type inference", () => {
    expect(JSON.parse(run(KUBECTL).output)[0]).toEqual({ NAME: "web-7d4b9c6f5-abcde", READY: "1/1", STATUS: "Running", RESTARTS: 0, AGE: "3d" });
    expect(JSON.parse(run(KUBECTL, "json", false).output)[0].RESTARTS).toBe("0");
    expect(JSON.parse(run("| a | b |\n| - | 1.50 |").output)[0]).toEqual({ a: null, b: "1.50" });
  });
  it("csv escapes commas and quotes", () => {
    expect(run("| a | b |\n| x,y | say \"hi\" |", "csv").output).toBe('a,b\n"x,y","say ""hi"""\n');
  });
  it("markdown and yaml", () => {
    expect(run("a  b\n1  2", "markdown").output).toBe("| a   | b   |\n| --- | --- |\n| 1   | 2   |\n");
    expect(run("a  b\n1  2", "yaml").output).toBe("- a: 1\n  b: 2\n");
  });
  it("errors", () => {
    expect(run("just one line of prose here").error).not.toBeNull();
    expect(run("")).toEqual({ output: "", error: null });
  });
});
