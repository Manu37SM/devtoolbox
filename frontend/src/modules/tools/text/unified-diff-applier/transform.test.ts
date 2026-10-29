import { describe, expect, it } from "vitest";
import { parsePatch, runUnifiedDiffApplier } from "./transform";

const ORIGINAL = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\n";
const PATCH = `diff --git a/f.txt b/f.txt
--- a/f.txt
+++ b/f.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+line two
 line 3
@@ -6,3 +6,4 @@
 line 6
 line 7
+line 7.5
 line 8
`;
const run = (input: string, patch: string, o: Partial<{ output: "result" | "report"; reverse: boolean; ignoreWhitespace: boolean }> = {}) =>
  runUnifiedDiffApplier(input, patch, { output: "result", reverse: false, ignoreWhitespace: false, ...o });

describe("parsePatch", () => {
  it("reads files and hunks", () => {
    const f = parsePatch(PATCH);
    expect(f).toHaveLength(1);
    expect(f[0]!.oldName).toBe("a/f.txt");
    expect(f[0]!.hunks.map((h) => h.oldStart)).toEqual([1, 6]);
    expect(f[0]!.hunks[1]!.lines.filter((l) => l.op === "+").map((l) => l.text)).toEqual(["line 7.5"]);
  });
});

describe("runUnifiedDiffApplier", () => {
  const PATCHED = "line 1\nline two\nline 3\nline 4\nline 5\nline 6\nline 7\nline 7.5\nline 8\n";
  it("applies hunks", () => expect(run(ORIGINAL, PATCH).output).toBe(PATCHED));
  it("reverses a patch", () => expect(run(PATCHED, PATCH, { reverse: true }).output).toBe(ORIGINAL));
  it("finds context at an offset and reports it", () => {
    const shifted = `extra a\nextra b\n${ORIGINAL}`;
    const out = run(shifted, PATCH, { output: "report" }).output;
    expect(out).toContain("Hunk 1 @@ -1,3 +1,3 @@: applied with offset +2 lines");
    expect(out).toContain("Hunk 2 @@ -6,3 +6,4 @@: applied with offset +2 lines");
    expect(out).toContain("2 of 2 hunks applied.");
    expect(out.endsWith(`extra a\nextra b\n${PATCHED}`)).toBe(true);
  });
  it("fails clearly when context is missing, unless whitespace is ignored", () => {
    const spaced = ORIGINAL.replace("line 2", "line  2");
    expect(run(spaced, PATCH).error?.message).toContain("Hunk 1 @@ -1,3 +1,3 @@: FAILED (context not found)");
    expect(run(spaced, PATCH, { ignoreWhitespace: true }).output).toBe(PATCHED);
  });
  it("handles new files and missing final newlines", () => {
    expect(run("", "--- /dev/null\n+++ b/new.txt\n@@ -0,0 +1,2 @@\n+hello\n+world\n").output).toBe("hello\nworld\n");
    expect(run("a\nb\n", "@@ -1,2 +1,2 @@\n a\n-b\n+c\n\\ No newline at end of file\n").output).toBe("a\nc");
  });
  it("rejects input without hunks", () => {
    expect(run("x", "not a patch").error?.message).toContain("No @@ hunks");
  });
});

describe("insert-only hunks", () => {
  it("inserts after the given line", () => {
    expect(run("a\nb\nc\n", "@@ -2,0 +3,1 @@\n+inserted\n").output).toBe("a\nb\ninserted\nc\n");
  });
});
