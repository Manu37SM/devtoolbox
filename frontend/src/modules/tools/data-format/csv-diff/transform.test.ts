import { describe, expect, it } from "vitest";
import { compareCsv } from "./transform";

const A = "id,name,age\n1,Ann,30\n2,Bob,31\n3,Cy,40";
const B = "id,name,age\n1,Ann,30\n2,Rob,32\n4,Di,22";

describe("compareCsv", () => {
  it("matches rows by key and shows cell changes", () => {
    const r = compareCsv(A, B, { keyColumns: "id" });
    expect(r.error).toBeNull();
    expect(r.output).toContain("- id=3");
    expect(r.output).toContain("+ id=4");
    expect(r.output).toContain('~ id=2: name: "Bob" → "Rob"; age: "31" → "32"');
    expect(r.output).toContain("1 added, 1 removed, 1 changed, 1 unchanged");
  });
  it("compares whole rows without a key", () => {
    const r = compareCsv(A, B, {});
    expect(r.output).toContain("- id=2, name=Bob, age=31");
    expect(r.output).toContain("+ id=4, name=Di, age=22");
    expect(r.output).toContain("2 added, 2 removed, 0 changed, 1 unchanged");
  });
  it("supports key numbers, ignored columns, case, whitespace and tolerance", () => {
    expect(compareCsv(A, B, { keyColumns: "1", ignoreColumns: "name,age" }).output).toContain("0 changed");
    expect(compareCsv("k,v\na,Hello", "k,v\na, hello ", { keyColumns: "k", ignoreCase: true }).output).toContain("0 changed");
    expect(compareCsv("k,v\na,Hello", "k,v\na, hello ", { keyColumns: "k" }).output).toContain("1 changed");
    expect(compareCsv("k,v\na,1.00", "k,v\na,1.004", { keyColumns: "k", numericTolerance: 0.01 }).output).toContain("0 changed");
    expect(compareCsv("k,v\na,1.00", "k,v\na,1.04", { keyColumns: "k", numericTolerance: 0.01 }).output).toContain("1 changed");
  });
  it("reports column changes and bad columns", () => {
    const r = compareCsv("id,a\n1,x", "id,b\n1,x", { keyColumns: "id" });
    expect(r.output).toContain("Columns added: b");
    expect(r.output).toContain("Columns removed: a");
    expect(compareCsv(A, B, { keyColumns: "nope" }).error?.message).toMatch(/not found/);
  });
  it("detects semicolon files, works without a header and emits csv/json", () => {
    expect(compareCsv("a;b\n1;2", "a;b\n1;3", { keyColumns: "a" }).output).toContain("1 changed");
    expect(compareCsv("x,y\n1,2", "x,y\n1,3", { hasHeader: false, keyColumns: "1" }).output).toContain("~ column1=1");
    const csv = compareCsv(A, B, { keyColumns: "id", output: "csv", includeUnchanged: true }).output.split("\n");
    expect(csv[0]).toBe("_diff,_changed,id,name,age");
    expect(csv).toContain("removed,,3,Cy,40");
    expect(csv).toContain("changed,name age,2,Rob,32");
    expect(csv).toContain("same,,1,Ann,30");
    expect(JSON.parse(compareCsv(A, B, { keyColumns: "id", output: "json" }).output).changed[0].changes).toHaveLength(2);
  });
  it("treats repeated keys in order instead of dropping rows", () => {
    expect(compareCsv("k,v\na,1\na,2", "k,v\na,1\na,3", { keyColumns: "k" }).output).toContain("1 changed, 1 unchanged");
  });
  it("handles empty input", () => {
    expect(compareCsv("", "", {})).toEqual({ output: "", error: null });
    expect(compareCsv("a", "", {}).error?.message).toMatch(/After CSV is empty/);
  });
});
