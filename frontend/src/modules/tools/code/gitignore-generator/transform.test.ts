import { describe, expect, it } from "vitest";
import { GITIGNORE_NAMES, generateGitignore } from "./transform";
import { GITIGNORE_TEMPLATES } from "./templates";

describe("generateGitignore", () => {
  it("combines templates in the order requested with headings", () => {
    const out = generateGitignore("java, maven", { dedupe: true }).output;
    expect(out.startsWith("# Java\n*.class")).toBe(true);
    expect(out).toContain("\n\n# Maven\ntarget/");
    expect(out.endsWith("\n")).toBe(true);
  });

  it("accepts aliases, mixed case, spaces and duplicates", () => {
    const out = generateGitignore("JS Idea node", { dedupe: true }).output;
    expect(out.match(/^# Node\.js$/gm)).toHaveLength(1);
    expect(out).toContain("# JetBrains IDEs");
  });

  it("removes patterns already emitted by an earlier template when deduping", () => {
    const withDedupe = generateGitignore("node,gradle,maven", { dedupe: true }).output;
    const without = generateGitignore("node,gradle,maven", { dedupe: false }).output;
    expect(withDedupe.match(/^build\/$/gm)).toHaveLength(1);
    expect(without.match(/^build\/$/gm)!.length).toBeGreaterThan(1);
  });

  it("lists the available templates when one is unknown", () => {
    const r = generateGitignore("java, cobol", { dedupe: true });
    expect(r.error?.message).toContain("cobol");
    expect(r.error?.message).toContain("Available:");
  });

  it("returns empty output for empty input", () => {
    expect(generateGitignore(" , ", { dedupe: true })).toEqual({ output: "", error: null });
  });

  it("ships well-formed templates", () => {
    expect(GITIGNORE_NAMES.length).toBeGreaterThanOrEqual(20);
    for (const t of Object.values(GITIGNORE_TEMPLATES)) {
      expect(t.patterns.length).toBeGreaterThan(0);
      expect(new Set(t.patterns).size).toBe(t.patterns.length);
    }
  });
});
