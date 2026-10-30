import { describe, expect, it } from "vitest";
import { joinCsv } from "./transform";

const L = "id,name\n1,Ann\n2,Bob\n3,Cy";
const R = "id,city\n2,Pune\n3,Goa\n3,Delhi\n4,Kochi";
const j = (type: string, extra = {}) => joinCsv(L, R, { leftKey: "id", joinType: type as never, ...extra });

describe("joinCsv", () => {
  it("inner join repeats left rows for every right match", () => {
    expect(j("inner").output).toBe("id,name,city\n2,Bob,Pune\n3,Cy,Goa\n3,Cy,Delhi");
  });
  it("left join keeps unmatched left rows", () => {
    expect(j("left").output).toBe("id,name,city\n1,Ann,\n2,Bob,Pune\n3,Cy,Goa\n3,Cy,Delhi");
  });
  it("right and full joins fill the key from the right row", () => {
    expect(j("right").output).toBe("id,name,city\n2,Bob,Pune\n3,Cy,Goa\n3,Cy,Delhi\n4,,Kochi");
    expect(j("full").output.split("\n")).toEqual(["id,name,city", "1,Ann,", "2,Bob,Pune", "3,Cy,Goa", "3,Cy,Delhi", "4,,Kochi"]);
  });
  it("anti joins return rows without a partner", () => {
    expect(j("left-anti").output).toBe("id,name,city\n1,Ann,");
    expect(j("right-anti").output).toBe("id,name,city\n4,,Kochi");
  });
  it("uses different key names, suffixes clashing columns and keeps right keys on request", () => {
    const r = joinCsv("id,name\n1,Ann", "uid,name\n1,Zed", { leftKey: "id", rightKey: "uid", suffix: "_r", dropRightKeys: false });
    expect(r.output).toBe("id,name,uid,name_r\n1,Ann,1,Zed");
  });
  it("supports composite keys, case-insensitive matching and column selection", () => {
    const r = joinCsv("a,b,v\nx,1,L", "a,b,w\nX,1,R", { leftKey: "a,b", ignoreCase: true, columns: "v,w" });
    expect(r.output).toBe("v,w\nL,R");
    expect(joinCsv("k,v\nX,1", "k,w\nx,2", { leftKey: "k", joinType: "inner" }).output).toBe("k,v,w");
  });
  it("outputs json, markdown and stats", () => {
    expect(JSON.parse(j("inner", { output: "json" }).output)[0]).toEqual({ id: "2", name: "Bob", city: "Pune" });
    expect(j("inner", { output: "markdown" }).output.split("\n")[1]).toBe("| --- | --- | --- |");
    expect(j("full", { output: "stats" }).output).toContain("Matched pairs: 3");
  });
  it("validates keys", () => {
    expect(joinCsv(L, R, {}).error?.message).toMatch(/key column/);
    expect(joinCsv(L, R, { leftKey: "zzz" }).error?.message).toMatch(/Left file/);
    expect(joinCsv(L, R, { leftKey: "id", rightKey: "id,city" }).error?.message).toMatch(/same number/);
    expect(joinCsv("", "", {})).toEqual({ output: "", error: null });
  });
});
