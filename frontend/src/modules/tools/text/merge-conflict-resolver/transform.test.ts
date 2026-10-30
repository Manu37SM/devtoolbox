import { describe, expect, it } from "vitest";
import { parseConflicts, resolveMergeConflicts } from "./transform";

const FILE = ["a", "<<<<<<< HEAD", "x = 1", "=======", "x = 2", ">>>>>>> feature", "b", "<<<<<<< HEAD", "same", "=======", "same", ">>>>>>> feature", "c"].join("\n");
const DIFF3 = ["<<<<<<< ours", "new", "||||||| base", "old", "=======", "other", ">>>>>>> theirs"].join("\n");

describe("merge conflict resolver", () => {
  it("parses conflicts with labels, line numbers and base", () => {
    const p = parseConflicts(FILE);
    expect(p.conflicts).toHaveLength(2);
    expect(p.conflicts[0]).toMatchObject({ startLine: 2, endLine: 6, oursLabel: "HEAD", theirsLabel: "feature", ours: ["x = 1"], theirs: ["x = 2"], base: null });
    expect(parseConflicts(DIFF3).conflicts[0]!.base).toEqual(["old"]);
  });
  it("resolves ours, theirs, both and both-reverse", () => {
    const r = (c: string) => resolveMergeConflicts(FILE, { defaultChoice: c as never }).output;
    expect(r("ours")).toBe("a\nx = 1\nb\nsame\nc");
    expect(r("theirs")).toBe("a\nx = 2\nb\nsame\nc");
    expect(r("both")).toBe("a\nx = 1\nx = 2\nb\nsame\nsame\nc".replace("same\nsame", "same"));
    expect(r("both-reverse")).toBe("a\nx = 2\nx = 1\nb\nsame\nc");
  });
  it("keeps markers by default but collapses identical sides", () => {
    const out = resolveMergeConflicts(FILE, {}).output;
    expect(out).toContain("<<<<<<< HEAD\nx = 1");
    expect(out).not.toMatch(/same\n=======/);
    expect(resolveMergeConflicts(FILE, { autoIdentical: false }).output).toContain("same\n=======\nsame");
  });
  it("applies per-conflict overrides and validates them", () => {
    expect(resolveMergeConflicts(FILE, { defaultChoice: "ours", overrides: "1=theirs" }).output).toBe("a\nx = 2\nb\nsame\nc");
    expect(resolveMergeConflicts(FILE, { overrides: "9=ours" }).error?.message).toMatch(/no conflict #9/);
    expect(resolveMergeConflicts(FILE, { overrides: "1=banana" }).error?.message).toMatch(/Bad override/);
  });
  it("supports the diff3 base and reports when it is missing", () => {
    expect(resolveMergeConflicts(DIFF3, { defaultChoice: "base" }).output).toBe("old");
    expect(resolveMergeConflicts(FILE, { defaultChoice: "base" }).error?.line).toBe(2);
  });
  it("reports unterminated conflicts, ignores whitespace on request and preserves CRLF", () => {
    expect(resolveMergeConflicts("<<<<<<< HEAD\nx\n=======\ny", {}).error).toMatchObject({ line: 1 });
    const ws = "<<<<<<< a\n  x\n=======\nx\n>>>>>>> b";
    expect(resolveMergeConflicts(ws, { ignoreWhitespace: true }).output).toBe("  x");
    expect(resolveMergeConflicts(ws.replace(/\n/g, "\r\n"), { defaultChoice: "theirs" }).output).toBe("x");
    expect(resolveMergeConflicts("p\r\n<<<<<<< a\r\nx\r\n=======\r\ny\r\n>>>>>>> b\r\nq", { defaultChoice: "ours" }).output).toBe("p\r\nx\r\nq");
  });
  it("writes a report", () => {
    const r = resolveMergeConflicts(FILE, { output: "report" }).output;
    expect(r).toContain("#1  lines 2-6");
    expect(r).toContain("2 conflict(s), 1 identical");
    expect(resolveMergeConflicts("plain", { output: "report" }).output).toBe("No conflict markers found.");
  });
});
