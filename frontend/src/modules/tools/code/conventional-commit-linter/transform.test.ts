import { describe, expect, it } from "vitest";
import { checkCommit, lintCommit, parseCommit } from "./transform";

const o = { maxHeader: 72, strictTypes: true };

describe("parseCommit", () => {
  it("parses header, body and footers", () => {
    const p = parseCommit("feat(api)!: add pagination\n\nLonger body\nsecond line\n\nBREAKING CHANGE: page size is now required\nRefs: #12");
    expect(p).toMatchObject({ type: "feat", scope: "api", breakingBang: true, description: "add pagination" });
    expect(p.body).toEqual(["Longer body", "second line"]);
    expect(p.footers).toEqual([{ token: "BREAKING CHANGE", value: "page size is now required" }, { token: "Refs", value: "#12" }]);
  });
  it("handles headers that do not conform", () => {
    expect(parseCommit("Fixed the thing").type).toBeNull();
  });
});

describe("lintCommit", () => {
  it("accepts a clean commit and maps bumps", () => {
    const r = lintCommit("fix(auth): handle expired tokens", o);
    expect(r.issues).toEqual([]);
    expect(r.bump).toBe("patch");
    expect(lintCommit("feat: add search", o).bump).toBe("minor");
    expect(lintCommit("chore: bump deps", o).bump).toBe("none");
    expect(lintCommit("refactor!: drop v1 client", o).bump).toBe("major");
    expect(lintCommit("fix: x\n\nBREAKING CHANGE: y", o).bump).toBe("major");
  });
  it("flags style problems", () => {
    const msgs = lintCommit("feat: Added new endpoint.", o).issues.map((i) => i.message);
    expect(msgs.some((m) => m.includes("lower-case"))).toBe(true);
    expect(msgs.some((m) => m.includes("punctuation"))).toBe(true);
    expect(msgs.some((m) => m.includes("imperative"))).toBe(true);
  });
  it("flags structural errors", () => {
    expect(lintCommit("nonsense", o).issues[0]!.level).toBe("error");
    expect(lintCommit("wibble: thing", o).issues[0]!.message).toContain("Unknown type");
    expect(lintCommit("wibble: thing", { ...o, strictTypes: false }).issues).toEqual([]);
    expect(lintCommit("feat: x\nbody without blank", o).issues.some((i) => i.message.includes("blank line"))).toBe(true);
    expect(lintCommit("feat: " + "a".repeat(80), o).issues.some((i) => i.message.includes("limit is 72"))).toBe(true);
    expect(lintCommit("feat(): x", o).issues.some((i) => i.message.includes("Scope is empty"))).toBe(true);
  });
});

describe("checkCommit", () => {
  it("renders a report and sets error only for hard failures", () => {
    const good = checkCommit("feat(ui): add dark mode", o);
    expect(good.error).toBeNull();
    expect(good.output).toContain("✓ Valid Conventional Commit");
    expect(good.output).toContain("SemVer bump: minor");
    const bad = checkCommit("oops", o);
    expect(bad.error).not.toBeNull();
    expect(bad.output).toContain("ERROR");
  });
});
