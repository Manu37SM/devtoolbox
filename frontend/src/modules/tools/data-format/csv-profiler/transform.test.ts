import { describe, expect, it } from "vitest";
import { detectDelimiter, inferKind, parseCsv, profileCsv } from "./transform";

const prof = (s: string, o = {}) => profileCsv(s, { delimiter: "auto", topValues: 3, ...o });
const CSV = `id,name,age,score,joined,active
1,Alice,30,88.5,2024-01-05,true
2,Bob,25,92.25,2024-02-10,false
3,Alice,,70,2023-12-31,true
4,"Smith, J",41,81,2024-03-01,yes
`;

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, embedded newlines and CRLF", () => {
    expect(parseCsv('a,b\r\n"x,1","he said ""hi"""\r\n"multi\nline",z\r\n', ",")).toEqual([["a", "b"], ["x,1", 'he said "hi"'], ["multi\nline", "z"]]);
  });
  it("reports unterminated quotes", () => {
    expect(parseCsv('a,b\n"oops,1\n', ",")).toEqual({ error: "Unterminated quoted field", line: 2 });
  });
  it("detects delimiters", () => {
    expect(detectDelimiter("a;b;c")).toBe(";");
    expect(detectDelimiter("a\tb")).toBe("\t");
    expect(detectDelimiter("abc")).toBe(",");
  });
});

describe("inferKind", () => {
  it("classifies", () => {
    expect(inferKind("12")).toBe("integer");
    expect(inferKind("-1.5")).toBe("decimal");
    expect(inferKind("1e5")).toBe("decimal");
    expect(inferKind("TRUE")).toBe("boolean");
    expect(inferKind("2024-02-30")).toBe("text");
    expect(inferKind("2024-02-10T10:00:00Z")).toBe("date");
    expect(inferKind("hello")).toBe("text");
  });
});

describe("profileCsv", () => {
  const out = prof(CSV).output;
  it("summarises the shape", () => { expect(out).toContain("Rows: 4   Columns: 6"); });
  it("numeric stats (checked against Python statistics)", () => {
    expect(out).toContain("age  [integer]");
    expect(out).toContain("missing: 1 (25%)");
    expect(out).toContain("min: 25   max: 41   mean: 32   median: 30   stddev: 8.18535");
    expect(out).toContain("score  [decimal]");
    expect(out).toContain("min: 70   max: 92.25   mean: 82.9375");
  });
  it("detects candidate keys, dates, repeated values, mixed booleans", () => {
    expect(out).toContain("id  [integer]\n  missing: 0 (0%)   unique: 4  (all distinct, candidate key)");
    expect(out).toContain("earliest: 2023-12-31   latest: 2024-03-01");
    expect(out).toContain("top: Alice (2)");
    expect(out).toContain("active  [boolean]");
  });
  it("warns about ragged rows and duplicate headers", () => {
    expect(prof("a,a\n1,2\n3\n").output).toMatch(/duplicate column names: a/);
    expect(prof("a,b\n1,2\n3\n").output).toMatch(/line 3 has 1, expected 2/);
  });
  it("mixed types and empty columns", () => {
    expect(prof("a,b\n1,\nx,\n").output).toMatch(/a  \[mixed \(integer 1, text 1\)\]/);
    expect(prof("a,b\n1,\n2,\n").output).toContain("b  [empty]");
  });
  it("errors and empty", () => {
    expect(prof('a\n"x').error?.line).toBe(2);
    expect(prof("")).toEqual({ output: "", error: null });
  });
});
