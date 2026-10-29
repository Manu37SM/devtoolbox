import { describe, expect, it } from "vitest";
import { nextVersion, parseLog, runChangelogGenerator } from "./transform";

const ONELINE = `a1b2c3d feat(api): add order search (#42)
b2c3d4e fix: handle null currency
c3d4e5f feat(auth)!: drop legacy tokens
d4e5f6a docs: update README
e5f6a7b Merge pull request #41 from acme/feature
f6a7b8c chore(deps): bump spring boot
0a1b2c3 Fix typo in banner`;

describe("parseLog", () => {
  it("parses one-line logs and skips merges", () => {
    const { commits, merges } = parseLog(ONELINE);
    expect(merges).toBe(1);
    expect(commits.map((c) => `${c.type}|${c.scope}|${c.breaking}`)).toEqual(["feat|api|false", "fix||false", "feat|auth|true", "docs||false", "chore|deps|false", "other||false"]);
  });
  it("parses full git log with BREAKING CHANGE footers", () => {
    const full = `commit 1234567890abcdef1234567890abcdef12345678
Author: Ann <ann@acme.com>
Date:   Wed Jan 31 10:00:00 2024 +0530

    refactor(db): rename tables

    BREAKING CHANGE: orders table is now customer_orders

commit abcdef1234567890abcdef1234567890abcdef12
Author: Ann <ann@acme.com>
Date:   Wed Jan 30 10:00:00 2024 +0530

    perf: cache exchange rates
`;
    const { commits } = parseLog(full);
    expect(commits[0]).toMatchObject({ hash: "1234567", type: "refactor", breaking: true, breakingNote: "orders table is now customer_orders" });
    expect(commits[1]).toMatchObject({ hash: "abcdef1", type: "perf" });
  });
});

describe("nextVersion", () => {
  it("bumps per semver rules", () => {
    const c = (type: string, breaking = false) => ({ hash: "", type, scope: "", subject: "", breaking, breakingNote: "", conventional: true });
    expect(nextVersion("1.4.2", [c("fix")])!.version).toBe("1.4.3");
    expect(nextVersion("v1.4.2", [c("feat")])!.version).toBe("1.5.0");
    expect(nextVersion("1.4.2", [c("fix", true)])!.version).toBe("2.0.0");
    expect(nextVersion("0.9.1", [c("feat", true)])!.version).toBe("0.10.0");
    expect(nextVersion("next", [c("fix")])).toBeNull();
  });
});

describe("runChangelogGenerator", () => {
  it("renders sections with links and hides noise by default", () => {
    const out = runChangelogGenerator(ONELINE, { currentVersion: "1.4.2", repoUrl: "https://github.com/acme/shop/", includeOther: false }).output;
    expect(out).toContain("## 2.0.0");
    expect(out).toContain("### ⚠ BREAKING CHANGES\n- **auth:** drop legacy tokens ([c3d4e5f](https://github.com/acme/shop/commit/c3d4e5f))");
    expect(out).toContain("### Features\n- **api:** add order search ([#42](https://github.com/acme/shop/pull/42)) ([a1b2c3d](https://github.com/acme/shop/commit/a1b2c3d))");
    expect(out).toContain("### Bug Fixes\n- handle null currency");
    expect(out).not.toContain("### Documentation");
    expect(out).toContain("1 merge commit skipped, 3 docs/chore/test/other hidden");
    expect(out).toContain("Suggested bump from 1.4.2: major (breaking change)");
  });
  it("includes every type when asked", () => {
    const out = runChangelogGenerator(ONELINE, { currentVersion: "1.4.2", repoUrl: "", includeOther: true }).output;
    expect(out).toContain("### Documentation\n- update README (d4e5f6a)");
    expect(out).toContain("### Other\n- Fix typo in banner (0a1b2c3)");
  });
});
