import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makefileGenerator } from "./transform";

const gen = (i: string, o: Parameters<typeof makefileGenerator>[1] = {}) => makefileGenerator(i, o);

describe("makefile generator", () => {
  it("uses tabs for recipes and adds .PHONY + help", () => {
    const out = gen("build: # Compile\n    go build ./...\ntest: build # Run tests\n    go test ./...").output;
    expect(out).toContain("\tgo build ./...");
    expect(out).toContain(".PHONY: build test help");
    expect(out).toContain("build: ## Compile");
    expect(out).toContain("test: build ## Run tests");
    expect(out).toContain(".DEFAULT_GOAL := help");
  });
  it("escapes shell dollars but not make syntax", () => {
    const out = gen("show:\n    echo $HOME $1 $(CC) ${CFLAGS} $@ $$X").output;
    expect(out).toContain("echo $$HOME $$1 $(CC) ${CFLAGS} $@ $$X");
    expect(gen("show:\n    echo $HOME", { escapeDollar: false }).output).toContain("echo $HOME");
  });
  it("file targets are not phony under auto", () => {
    const out = gen("bin/app: main.c\n    cc -o $@ $<\nclean:\n    rm -rf bin", { help: false }).output;
    expect(out).toContain(".PHONY: clean\n");
    expect(out).toContain(".DEFAULT_GOAL := bin/app");
  });
  it("user rules override preset rules", () => {
    const out = gen("test:\n    echo mine", { preset: "go" }).output;
    expect(out.match(/^test:/gm)).toHaveLength(1);
    expect(out).toContain("echo mine");
    expect(out).not.toContain("go test");
    expect(out).toContain("go build");
  });
  it("silent prefixes @", () => {
    expect(gen("a:\n    echo hi\nb:\n    @echo no", { silent: true }).output).toMatch(/\t@echo hi/);
  });
  it("rejects bad input", () => {
    expect(gen("    orphan command").error).not.toBeNull();
    expect(gen("a b: x").error).not.toBeNull();
    expect(gen("a:\n    x\na:\n    y").error?.message).toMatch(/twice/);
    expect(gen("a:\n x", { defaultGoal: "zzz" }).error).not.toBeNull();
  });
  it("warns about unknown dependencies", () => {
    expect(gen("a: ghost\n    true").output).toContain("# NOTE:");
  });
  it("empty", () => expect(gen("").output).toBe(""));
});

// Oracle: GNU make parses the file and dry-runs every target.
const mk = spawnSync("make", ["--version"], { encoding: "utf8" });
const gnu = !mk.error && /GNU Make/.test(mk.stdout);
const bash = spawnSync("bash", ["-c", "true"]).status === 0;
describe.skipIf(!gnu || !bash)("accepted by GNU make", () => {
  const dir = mkdtempSync(join(tmpdir(), "mk-"));
  const run = (text: string, args: string[]) => {
    const d = mkdtempSync(join(dir, "w-"));
    writeFileSync(join(d, "Makefile"), text);
    mkdirSync(join(d, "src"));
    writeFileSync(join(d, "src", "a.c"), "int main(void){return 0;}\n");
    return { d, ...spawnSync("make", ["-C", d, ...args], { encoding: "utf8" }) };
  };
  const targetsOf = (text: string) => [...text.matchAll(/^([A-Za-z0-9_.\/%-]+):(?![=])/gm)].map((m) => m[1]!).filter((t) => !t.includes("%") && !t.startsWith("."));
  for (const preset of ["node", "python", "go", "maven", "docker", "c"] as const) {
    it(`preset ${preset}: parses and dry-runs every target`, () => {
      const r = gen("", { preset });
      expect(r.error).toBeNull();
      const targets = targetsOf(r.output);
      expect(targets.length).toBeGreaterThan(2);
      for (const t of targets) {
        const p = run(r.output, ["-n", t]);
        expect(p.status, `${t}\n${p.stderr}\n${r.output}`).toBe(0);
      }
    });
  }
  it("help lists the described targets", () => {
    const r = gen("build: # Compile it\n    true\nlint: # Lint it\n    true");
    const p = run(r.output, ["help"]);
    expect(p.status, p.stderr).toBe(0);
    expect(p.stdout).toMatch(/build\s+Compile it/);
    expect(p.stdout).toMatch(/lint\s+Lint it/);
  });
  it("real execution: shell variables survive, fail-fast is on", () => {
    const r = gen("show:\n    X=hello; echo $X\nboom:\n    false\n    echo unreachable");
    const ok = run(r.output, ["show"]);
    expect(ok.stdout).toContain("hello");
    const bad = run(r.output, ["boom"]);
    expect(bad.status).not.toBe(0);
    expect(bad.stdout).not.toContain("unreachable\n");
  });
  it("the C preset really builds", () => {
    const r = gen("", { preset: "c" });
    const p = run(r.output, ["all"]);
    if (/cc: (command )?not found|No such file/.test(p.stderr)) return; // no C compiler on this machine
    expect(p.status, p.stderr).toBe(0);
  });
  it("oracle rejects spaces instead of tabs", () => {
    expect(run("a:\n    echo hi\n", ["-n", "a"]).status).not.toBe(0);
  });
});
