import { describe, expect, it } from "vitest";
import { bump, compareSemver, formatSemver, parseSemver, runSemver } from "./transform";

const v = (s: string) => parseSemver(s)!;
const opts = { action: "sort", sortOrder: "asc", bumpLevel: "patch", preid: "rc" } as const;

describe("parseSemver", () => {
  it("parses core, pre-release and build parts", () => {
    expect(v("1.2.3-alpha.1+exp.sha.5114f85")).toEqual({ major: 1, minor: 2, patch: 3, prerelease: ["alpha", 1], build: "exp.sha.5114f85" });
    expect(formatSemver(v("v1.0.0"))).toBe("1.0.0");
  });
  it.each(["1.2", "01.2.3", "1.2.3-", "1.2.3-01", "a.b.c", "1.2.3.4"])("rejects %s", (s) => {
    expect(parseSemver(s)).toBeNull();
  });
});

describe("compareSemver (semver.org §11 ordering)", () => {
  const ordered = ["1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-beta", "1.0.0-beta.2", "1.0.0-beta.11", "1.0.0-rc.1", "1.0.0", "1.0.1", "1.1.0", "2.0.0"];
  it("matches the spec's example precedence chain", () => {
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(compareSemver(v(ordered[i]!), v(ordered[i + 1]!))).toBe(-1);
      expect(compareSemver(v(ordered[i + 1]!), v(ordered[i]!))).toBe(1);
    }
  });
  it("ignores build metadata", () => {
    expect(compareSemver(v("1.0.0+a"), v("1.0.0+b"))).toBe(0);
  });
});

describe("bump (npm semantics)", () => {
  const b = (s: string, level: Parameters<typeof bump>[1], id = "rc") => formatSemver(bump(v(s), level, id));
  it("bumps stable versions", () => {
    expect(b("1.2.3", "patch")).toBe("1.2.4");
    expect(b("1.2.3", "minor")).toBe("1.3.0");
    expect(b("1.2.3", "major")).toBe("2.0.0");
  });
  it("graduates pre-releases instead of skipping a version", () => {
    expect(b("1.2.3-rc.1", "patch")).toBe("1.2.3");
    expect(b("1.3.0-rc.1", "minor")).toBe("1.3.0");
    expect(b("2.0.0-rc.1", "major")).toBe("2.0.0");
    expect(b("1.2.3-rc.1", "minor")).toBe("1.3.0");
  });
  it("starts and advances pre-releases", () => {
    expect(b("1.2.3", "prepatch")).toBe("1.2.4-rc.0");
    expect(b("1.2.3", "preminor", "beta")).toBe("1.3.0-beta.0");
    expect(b("1.2.3", "premajor")).toBe("2.0.0-rc.0");
    expect(b("1.2.3", "prerelease")).toBe("1.2.4-rc.0");
    expect(b("1.2.4-rc.0", "prerelease")).toBe("1.2.4-rc.1");
    expect(b("1.2.4-rc.1", "prerelease", "beta")).toBe("1.2.4-beta.0");
    expect(b("1.2.4-rc", "prerelease")).toBe("1.2.4-rc.0");
  });
  it("drops build metadata", () => {
    expect(b("1.2.3+build", "patch")).toBe("1.2.4");
  });
});

describe("runSemver", () => {
  it("sorts ascending and descending, keeping the original text", () => {
    expect(runSemver("1.10.0\nv1.2.0\n1.2.0-rc.1", opts).output).toBe("1.2.0-rc.1\nv1.2.0\n1.10.0");
    expect(runSemver("1.0.0\n2.0.0", { ...opts, sortOrder: "desc" }).output).toBe("2.0.0\n1.0.0");
  });
  it("compares exactly two versions", () => {
    expect(runSemver("1.0.0\n1.0.1", { ...opts, action: "compare" }).output).toContain("1.0.1 is newer");
    expect(runSemver("1.0.0\n1.0.0+x", { ...opts, action: "compare" }).output).toContain("equal");
    expect(runSemver("1.0.0", { ...opts, action: "compare" }).error).not.toBeNull();
  });
  it("bumps every line", () => {
    expect(runSemver("1.0.0\n2.3.4", { ...opts, action: "bump", bumpLevel: "minor" }).output).toBe("1.0.0  →  1.1.0\n2.3.4  →  2.4.0");
  });
  it("validates line by line without failing the batch", () => {
    const out = runSemver("1.2.3-beta+5\nnope", { ...opts, action: "validate" }).output;
    expect(out).toContain("✓ 1.2.3-beta+5");
    expect(out).toContain("pre-release beta");
    expect(out).toContain("✗ nope");
  });
  it("names the invalid line for other actions and handles empty input", () => {
    expect(runSemver("1.0\n1.0.0", opts).error?.message).toContain('"1.0"');
    expect(runSemver("", opts)).toEqual({ output: "", error: null });
  });
});
