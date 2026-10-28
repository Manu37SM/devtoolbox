import { describe, expect, it } from "vitest";
import { esc, generateBadges } from "./transform";

const gen = (s: string, o = {}) => generateBadges(s, { kind: "static", format: "markdown", style: "flat", ...o });

describe("esc (shields.io static badge escaping)", () => {
  it("doubles dashes and underscores, spaces become underscores", () => {
    expect(esc("build status")).toBe("build_status");
    expect(esc("a-b")).toBe("a--b");
    expect(esc("a_b")).toBe("a__b");
    expect(esc("100%")).toBe("100%25");
  });
});

describe("static", () => {
  it("builds a markdown badge", () => {
    expect(gen("label: build status\nmessage: passing\ncolor: brightgreen").output).toBe("![build status](https://img.shields.io/badge/build_status-passing-brightgreen)\n");
  });
  it("style, logo and link", () => {
    const o = gen("label: Java\nmessage: 21\ncolor: #ED8B00\nlogo: openjdk\nlink: https://openjdk.org", { style: "for-the-badge" }).output;
    expect(o).toBe("[![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&style=for-the-badge)](https://openjdk.org)\n");
  });
  it("html, rst and url formats", () => {
    expect(gen("label: a\nmessage: b", { format: "html", style: "flat-square" }).output).toBe('<img src="https://img.shields.io/badge/a-b-blue?style=flat-square" alt="a">\n');
    expect(gen("label: a\nmessage: b", { format: "rst" }).output).toBe(".. image:: https://img.shields.io/badge/a-b-blue\n   :alt: a\n");
    expect(gen("message: only\ncolor: red", { format: "url" }).output).toBe("https://img.shields.io/badge/only-red\n");
  });
  it("validates", () => {
    expect(gen("color: red").error?.message).toMatch(/label/);
    expect(gen("label: a\ncolor: not a color!").error?.message).toMatch(/color/);
    expect(gen("")).toEqual({ output: "", error: null });
  });
});

describe("sets", () => {
  it("github with workflow", () => {
    const lines = gen("repo: acme/widgets\nworkflow: ci.yml", { kind: "github" }).output.trim().split("\n");
    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe("[![Build](https://img.shields.io/github/actions/workflow/status/acme/widgets/ci.yml?branch=main)](https://github.com/acme/widgets/actions/workflows/ci.yml)");
    expect(lines[1]).toContain("github/v/release/acme/widgets");
  });
  it("npm, pypi, maven", () => {
    expect(gen("package: @scope/pkg", { kind: "npm" }).output).toContain("https://img.shields.io/npm/v/@scope/pkg");
    expect(gen("package: requests", { kind: "pypi", style: "social" }).output).toContain("pypi/v/requests?style=social");
    expect(gen("group: org.springframework\nartifact: spring-core", { kind: "maven-central" }).output).toContain("maven-central/v/org.springframework/spring-core");
    expect(gen("repo: bad", { kind: "github" }).error).not.toBeNull();
    expect(gen("", { kind: "npm" })).toEqual({ output: "", error: null });
    expect(gen("x: y", { kind: "npm" }).error?.message).toMatch(/package/);
  });
});
