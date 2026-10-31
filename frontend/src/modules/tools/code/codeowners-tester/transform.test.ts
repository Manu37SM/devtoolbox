import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { codeownersTester, parseCodeowners, patternToRegex, resolve } from "./transform";

const O = { flavor: "github", view: "path", lint: true, ruleUsage: false, caseInsensitive: false, format: "table" } as const;
const owners = (file: string, path: string, flavor: "github" | "gitlab" = "github") => {
  const { rules } = parseCodeowners(file, { ...O, flavor });
  return resolve(path, rules, { ...O, flavor }).owners;
};

describe("matching (GitHub)", () => {
  const f = `
# comment
*                       @global
*.js                    @frontend
/docs/                  @docs-team
docs/*                  @docs-shallow
/src/api/               @backend @org/api
/src/api/legacy         @legacy
apps/                   @apps
/README.md              user@example.com
**/test/**              @qa
`;
  it("last matching rule wins", () => {
    expect(owners(f, "main.go")).toEqual(["@global"]);
    expect(owners(f, "lib/a.js")).toEqual(["@frontend"]);
    expect(owners(f, "src/api/user.go")).toEqual(["@backend", "@org/api"]);
    expect(owners(f, "src/api/legacy/x.go")).toEqual(["@legacy"]);
    expect(owners(f, "src/api/legacy")).toEqual(["@legacy"]);
  });
  it("directory vs docs/* depth", () => {
    expect(owners(f, "docs/a.md")).toEqual(["@docs-shallow"]); // later docs/* beats /docs/
    expect(owners(f, "docs/sub/b.md")).toEqual(["@docs-team"]);
  });
  it("unanchored dir matches at any depth, root-anchored file only at root", () => {
    expect(owners(f, "x/y/apps/z.txt")).toEqual(["@apps"]);
    expect(owners(f, "README.md")).toEqual(["user@example.com"]);
    expect(owners(f, "pkg/README.md")).toEqual(["@global"]);
  });
  it("** patterns", () => {
    expect(owners(f, "src/a/test/b.go")).toEqual(["@qa"]);
    expect(owners(f, "test/b.go")).toEqual(["@qa"]);
  });
  it("a rule with no owners clears ownership", () => {
    expect(owners("* @a\n/vendor/\n", "vendor/x.go")).toEqual([]);
  });
  it("no match", () => {
    expect(owners("/docs/ @a", "src/x")).toEqual([]);
  });
  it("case sensitivity", () => {
    expect(owners("/Docs/ @a", "docs/x")).toEqual([]);
    const { rules } = parseCodeowners("/Docs/ @a", { ...O, caseInsensitive: true });
    expect(resolve("docs/x", rules, { ...O, caseInsensitive: true }).owners).toEqual(["@a"]);
  });
  it("inline comments and escaped #", () => {
    expect(owners("*.md @doc # trailing comment", "a.md")).toEqual(["@doc"]);
    expect(owners("\\#notes.md @n", "#notes.md")).toEqual(["@n"]);
  });
  it("escaped space in paths", () => {
    expect(owners("/my\\ docs/ @sp", "my docs/a.md")).toEqual(["@sp"]);
  });
});

describe("gitlab sections", () => {
  const f = `
[Docs] @docs-owner
*.md
/api/ @api-owner

^[Optional]
/infra/ @infra

[Security][2] @sec
*.pem
/api/auth/
`;
  it("owners aggregate across sections; defaults apply", () => {
    expect(owners(f, "README.md", "gitlab")).toEqual(["@docs-owner"]);
    expect(owners(f, "api/auth/key.pem", "gitlab").sort()).toEqual(["@api-owner", "@sec"]);
    expect(owners(f, "infra/main.tf", "gitlab")).toEqual(["@infra"]);
  });
  it("parses section metadata", () => {
    const { sections } = parseCodeowners(f, { ...O, flavor: "gitlab" });
    expect(sections.map((s) => [s.name, s.optional, s.approvals])).toEqual([["Docs", false, 1], ["Optional", true, 1], ["Security", false, 2]]);
  });
});

describe("lint", () => {
  const run = (file: string, paths = "", o: Parameters<typeof codeownersTester>[1] = {}) => {
    const r = codeownersTester(file + (paths ? "\n---\n" + paths : ""), o);
    expect(r.error).toBeNull();
    return r.output;
  };
  it("invalid owners and unsupported syntax", () => {
    const out = run("*.js frontend\n!*.md @a\n/x/[ab].txt @a\n./src @a\n/y\\z @a");
    expect(out).toMatch(/line 1: "frontend" is not a valid owner/);
    expect(out).toMatch(/line 2: negation/);
    expect(out).toMatch(/line 3: character classes/);
    expect(out).toMatch(/line 4: patterns must not start with \.\//);
    expect(out).toMatch(/line 5: only \\#/);
  });
  it("duplicates, catch-all order and unused rules", () => {
    const out = run("/a/ @a\n* @all\n/a/ @b\n/nope/ @n", "a/f\nb/g");
    expect(out).toMatch(/line 1: pattern \/a\/ is repeated on line 3/);
    expect(out).toMatch(/line 2: catch-all \* comes after other rules/);
    expect(out).toMatch(/line 4: \/nope\/ matches none of the test paths/);
  });
  it("overridden rules", () => {
    const out = run("/a/ @a\n* @all", "a/f");
    expect(out).toMatch(/line 1: \/a\/ matches test paths but is always overridden/);
  });
  it("clean file", () => {
    expect(run("* @a\n/docs/ @b", "docs/x\nsrc/y")).toMatch(/No warnings/);
  });
});

describe("output", () => {
  const file = "* @a\n/docs/ @b @c\n";
  it("table", () => {
    const out = codeownersTester(file + "---\ndocs/x.md\nsrc/y.ts", {}).output;
    expect(out).toContain("2 paths tested");
    expect(out).toMatch(/docs\/x\.md\s+@b @c\s+line 2 \/docs\//);
  });
  it("grouped by owner", () => {
    const out = codeownersTester(file + "---\ndocs/x.md\nsrc/y.ts", { view: "owner" }).output;
    expect(out).toMatch(/@a \(1\)\n  src\/y\.ts/);
    expect(out).toMatch(/@b \(1\)\n  docs\/x\.md/);
  });
  it("rule usage", () => {
    expect(codeownersTester(file + "---\ndocs/x.md", { ruleUsage: true }).output).toMatch(/line 1\s+\*\s+@a\s+wins 0, matches 1/);
  });
  it("json", () => {
    const j = JSON.parse(codeownersTester(file + "---\ndocs/x.md", { format: "json" }).output) as { paths: Array<{ owners: string[] }> };
    expect(j.paths[0]!.owners).toEqual(["@b", "@c"]);
  });
  it("hint without paths; errors", () => {
    expect(codeownersTester(file).output).toMatch(/containing only ---/);
    expect(codeownersTester("# only comments").error?.message).toMatch(/No rules/);
    expect(codeownersTester("").output).toBe("");
  });
});

// ---- oracle: git's own ignore engine (CODEOWNERS patterns follow gitignore) ----
const gitOk = spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;
const FILES = [
  "README.md", "a.js", "main.go", "foo1.txt", "foo12.txt", "sub/foo1.txt",
  "src/a.js", "src/x/y/z.ts", "src/x/test/t.ts", "src/test/t.ts", "src/b.ts", "src/build/o.js",
  "docs/a.md", "docs/sub/b.md", "docs/sub/deep/c.md", "app/docs/d.md", "lib/docs.txt",
  "build/out.js", "apps/web/config/app.json", "apps/api/config/x.yml", "apps/web/config.json",
  "a/b/c.txt", "x/a/b/c.txt", "x/b", "logs/x.log", "svc/logs/y.log", "svc/logs/n/z.log", "root.md", "pkg/root.md",
];
const PATTERNS = [
  "*", "*.js", "*.md", "/*.md", "/README.md", "README.md", "docs/", "/docs/", "docs/*", "/docs/*", "docs/**", "docs/**/*", "/docs",
  "**/docs", "**/docs/", "src/**/test", "src/**/test/", "src/**/*.ts", "src/*/", "a/b", "/a/b/", "apps/*/config", "apps/*/config/", "foo?.txt", "build", "build/",
  "**/logs/*.log", "logs/", "**/test/**", "src/**", "/src/x", "x/a/b/c.txt", "lib/doc*",
];
describe.skipIf(!gitOk)("git check-ignore oracle", () => {
  it("our regexes agree with git for every pattern × path", () => {
    const dir = mkdtempSync(join(tmpdir(), "co-"));
    try {
      spawnSync("git", ["init", "-q"], { cwd: dir });
      for (const f of FILES) {
        mkdirSync(join(dir, dirname(f)), { recursive: true });
        writeFileSync(join(dir, f), "x");
      }
      const dirsOf = (p: string) => p.split("/").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("/"));
      const bad: string[] = [];
      for (const pat of PATTERNS) {
        writeFileSync(join(dir, ".gitignore"), pat + "\n");
        const all = [...new Set([...FILES, ...FILES.flatMap(dirsOf)])];
        const r = spawnSync("git", ["check-ignore", "--no-index", "--stdin"], { cwd: dir, input: all.join("\n"), encoding: "utf8" });
        const ignored = new Set(r.stdout.split("\n").filter(Boolean));
        const { re } = patternToRegex(pat, false);
        const lastSeg = pat.replace(/\/$/, "").split("/").pop()!;
        const wildcardLast = /[*?]/.test(lastSeg) && lastSeg !== "**";
        for (const f of FILES) {
          // GitHub: a trailing wildcard component only matches at that depth, so a match through an ancestor directory doesn't count
          const viaAncestor = dirsOf(f).some((d) => ignored.has(d));
          const anchored = pat.replace(/\/$/, "").includes("/");
          const expected = ignored.has(f) && !(wildcardLast && anchored && !pat.includes("**") && viaAncestor && !pat.endsWith("/"));
          if (re.test(f) !== expected) bad.push(`${pat} vs ${f}: ours=${re.test(f)} git=${expected}`);
        }
      }
      expect(bad).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
