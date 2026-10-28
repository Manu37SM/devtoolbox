import { describe, expect, it } from "vitest";
import { generateEditorconfig } from "./transform";

const o = { indentStyle: "space" as const, indentSize: 2, endOfLine: "lf" as const, charset: "utf-8" as const, trimTrailing: true, finalNewline: true, maxLineLength: 0, perLanguage: true };

describe("generateEditorconfig", () => {
  it("writes the root section", () => {
    const r = generateEditorconfig("", o).output;
    expect(r.startsWith("root = true\n\n[*]\nindent_style = space\nindent_size = 2\n")).toBe(true);
    expect(r).not.toContain("max_line_length");
  });
  it("adds per-language overrides", () => {
    const r = generateEditorconfig("java, go md", o).output;
    expect(r).toContain("[*.java]\nindent_size = 4");
    expect(r).toContain("[*.go]\nindent_style = tab");
    expect(r).toContain("[*.md]\ntrim_trailing_whitespace = false");
  });
  it("skips overrides when disabled and honours tabs / line length", () => {
    expect(generateEditorconfig("java", { ...o, perLanguage: false }).output).not.toContain("[*.java]");
    const t = generateEditorconfig("java", { ...o, indentStyle: "tab", maxLineLength: 100 }).output;
    expect(t).toContain("tab_width = 2");
    expect(t).toContain("[*.java]\ntab_width = 4");
    expect(t).toContain("max_line_length = 100");
  });
  it("rejects unknown languages", () => {
    expect(generateEditorconfig("cobol", o).error?.message).toMatch(/Unknown language/);
  });
});
